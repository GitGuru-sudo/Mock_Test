# Business Logic & Workflow Management

## Overview

All business logic lives exclusively in `server/src/services/`. Controllers are intentionally thin — they only read from `req`, call a service, and send a response. This separation means business rules are testable in isolation and cannot be bypassed through any route.

---

## Core Business Rules

### Rule 1 — Attendance Gate

**Where:** `resultService.recordResult()` — GATE 1

**Rule:** A Result document can only be created if the student has an Attendance record for that session with `status === 'present'`.

```
Officer records result for Student A in Session X
         │
         ▼
attendanceService.wasPresent(sessionX, studentA)
         │
  present? ─── YES ──► continue to Gate 2
         │
        NO
         │
         ▼
  throw ApiError(422, 'ATTENDANCE_GATE')
  Response: { success: false, errors: [{ code: 'ATTENDANCE_GATE' }] }
```

**Why:** Prevents data corruption where a result exists for a session the student never attended. Also ensures the attendance step always precedes the results step in the workflow.

---

### Rule 2 — Round Sequence Gate

**Where:** `resultService.recordResult()` — GATE 2

**Rule:** For any session with `roundNumber > 1`, there must be an existing Result for the same student + company with `roundNumber = N-1` and `outcome = 'pass'`. This check is skipped for round 1.

```
Session is Round 3 for Google
         │
         ▼
Result.findOne({
  student: studentA,
  company: Google,
  roundNumber: 2,      ← N - 1
  outcome: 'pass'
})
         │
  found? ─── YES ──► continue to Gate 3
         │
        NO
         │
         ▼
  throw ApiError(422, 'ROUND_SEQUENCE')
```

**Why:** Prevents officers from accidentally (or deliberately) recording results out of order. Enforces the sequential nature of multi-round interviews.

---

### Rule 3 — Elimination Gate

**Where:** `resultService.recordResult()` — GATE 3

**Rule:** If any Result exists for the same student + company combination with `outcome === 'fail'`, no further results can be recorded for that student at that company.

```
Result.findOne({
  student: studentA,
  company: Google,
  outcome: 'fail'     ← any round
})
         │
  found? ─── YES ──► throw ApiError(422, 'ELIMINATED')
         │
        NO
         │
         ▼
  CREATE Result document
```

**Why:** Once a student fails any round, they are eliminated from that company's recruitment cycle. Subsequent rounds cannot have results for them.

---

### Rule 4 — Offer Implies Placed

**Where:** `resultService.recordResult()` — post-create side effect

**Rule:** When a Result is created or updated with `outcome === 'offer'`, the student's `placementStatus` is automatically updated to `'placed'`.

```js
if (outcome === 'offer') {
  await Student.findByIdAndUpdate(studentId, { placementStatus: 'placed' });
}
```

This also applies in `resultService.updateResult()` — updating an existing result to `offer` also triggers the status update.

---

### Rule 5 — In-Process Trigger

**Where:** `attendanceService.bulkMarkAttendance()` — post-upsert side effect

**Rule:** When attendance is bulk-marked and a student is present in a **round 1** session, if their `placementStatus` is currently `'not_placed'`, it is updated to `'in_process'`.

```
For each record in bulkMarkAttendance():
  IF session.roundNumber === 1
  AND record.status === 'present'
  AND student.placementStatus === 'not_placed'
  THEN
    Student.findByIdAndUpdate(student._id, { placementStatus: 'in_process' })
```

**Why:** As soon as a student sits for their first interview, they enter the recruitment process. This is tracked automatically — no manual update needed.

---

### Rule 6 — Soft Delete Isolation

**Where:** `studentService.js` — all queries

**Rule:** Every query against the Student collection includes `{ isDeleted: false }`. Soft-deleted students are invisible to all API endpoints.

```js
// Every student service method:
Student.findOne({ _id: id, isDeleted: false })
Student.find({ isDeleted: false, ...filters })
Student.findOneAndUpdate({ _id: id, isDeleted: false }, ...)
```

The DELETE endpoint (`DELETE /api/students/:id`) sets `isDeleted: true` — it never removes the document. All historical Attendance and Result records remain intact and linked to the soft-deleted student for reporting purposes.

---

## Full Result Recording Workflow

This is the most complex workflow — 3 gates must pass before a result is persisted.

```
POST /api/results
{ sessionId, studentId, outcome, remarks }
        │
        ▼
resultsController.recordResult()
        │
        ▼
resultService.recordResult(sessionId, studentId, outcome, remarks)
        │
        ├── GATE 1: Attendance check ─────────────────────────────────►  422 ATTENDANCE_GATE
        │   attendanceService.wasPresent(sessionId, studentId)
        │
        ├── Load session = InterviewSession.findById(sessionId).populate('company')
        │
        ├── GATE 2: Round sequence (if roundNumber > 1) ─────────────►  422 ROUND_SEQUENCE
        │   Result.findOne({ student, company, roundNumber: N-1, outcome: 'pass' })
        │
        ├── GATE 3: Elimination check ────────────────────────────────►  422 ELIMINATED
        │   Result.findOne({ student, company, outcome: 'fail' })
        │
        ├── CREATE: Result.create({ session, student, company, roundNumber, outcome, remarks })
        │
        ├── SIDE EFFECT: if outcome === 'offer'
        │   └── Student.findByIdAndUpdate(studentId, { placementStatus: 'placed' })
        │
        └── CACHE: redis.del('dashboard:stats')
                    │
                    ▼
           201 { success: true, data: { result } }
```

---

## Attendance Workflow

```
POST /api/attendance/bulk
{ sessionId, records: [{ studentId, status }] }
        │
        ▼
attendanceService.bulkMarkAttendance(sessionId, records)
        │
        ├── Load session = InterviewSession.findById(sessionId).populate('company')
        │
        ├── For each record (parallel Promise.all):
        │   └── Attendance.findOneAndUpdate(
        │         { session, student },
        │         { session, student, company, roundNumber, status, markedAt },
        │         { upsert: true, new: true }
        │       )
        │       → IDEMPOTENT: calling twice with same data produces same result
        │
        ├── If session.roundNumber === 1:
        │   For each present student (parallel):
        │   └── IF student.placementStatus === 'not_placed'
        │       THEN Student.findByIdAndUpdate(..., { placementStatus: 'in_process' })
        │
        └── redis.del('dashboard:stats')
                    │
                    ▼
           200 { success: true, data: { attendance: [...] } }
```

---

## Session Eligibility Logic

**Where:** `sessionService.getEligibleStudents(sessionId)`

**Used by:** Attendance page and Results page — both call `GET /api/sessions/:id/eligible-students`

For each student in the system, the service computes:

```
For round 1:
  - ALL active (isDeleted: false) students are eligible
  - No prior round check needed

For round N > 1:
  - Student must have passed round N-1 for the same company
  - If any prior 'fail' result exists for student+company → ineligible

Return shape per student:
{
  student:         { _id, studentId, name, email, branch, year, cgpa, placementStatus }
  attendance:      { status, markedAt, _id } | null   ← existing attendance if already marked
  existingResult:  { _id, outcome, remarks } | null   ← existing result if already recorded
  eligible:        true | false
  reason:          null | "Failed in round X" | "Did not pass round N-1"
}
```

This single endpoint powers both the Attendance page (shows all students, marks ineligible ones as disabled) and the Results page (filters to `present` students only).

---

## Dashboard Aggregation

**Where:** `dashboardService.getStats()`

**Cache:** Redis `dashboard:stats` key with 60s TTL. Cache-aside pattern.

```
GET /api/dashboard/stats
        │
        ▼
Check redis.get('dashboard:stats')
        │
  cache hit? ──► return JSON.parse(cached)     [~1ms response]
        │
       miss
        │
        ▼
Parallel MongoDB aggregations:
  1. Student.aggregate($match isDeleted:false → $group by placementStatus)
     → { placed: N, in_process: N, not_placed: N, rejected: N }

  2. Company.countDocuments()
     Company.countDocuments({ recruitmentStatus: 'ongoing' })

  3. Student.aggregate($group by branch → placed count per branch)
     → [{ _id: 'CSE', total: 15, placed: 8 }, ...]

  4. Result.aggregate($match outcome:offer → $group by company → $sort → $limit 5 → $lookup)
     → [{ company: 'Google', offersCount: 12 }, ...]

  5. InterviewSession.find({ scheduledDate: today, status: 'scheduled' })
     → [{ company, roundName, venue, scheduledDate, status }, ...]
        │
        ▼
redis.set('dashboard:stats', JSON.stringify(stats), { ex: 60 })
        │
        ▼
200 { success: true, data: stats }
```

Frontend uses `refetchInterval: 60_000` in the React Query hook, so it automatically refreshes every 60 seconds.

---

## JWT Authentication Flow

```
POST /api/auth/login
{ email, password }
        │
        ▼
authService.login(email, password)
        │
        ├── User.findOne({ email })  → 401 if not found
        ├── bcrypt.compare(password, user.password)  → 401 if mismatch
        │
        ├── accessToken = jwt.sign(
        │     { userId, role },
        │     JWT_ACCESS_SECRET,
        │     { expiresIn: '15m' }
        │   )
        │
        ├── refreshToken = jwt.sign(
        │     { userId },
        │     JWT_REFRESH_SECRET,
        │     { expiresIn: '7d' }
        │   )
        │
        ├── refreshTokenHash = bcrypt.hash(refreshToken, 10)
        ├── user.refreshTokenHash = refreshTokenHash
        ├── user.save()
        │
        └── res.cookie('refreshToken', rawToken, {
              httpOnly: true,
              sameSite: 'strict',
              maxAge: 7d,
              secure: NODE_ENV === 'production'
            })
            res.json({ accessToken, user: { _id, name, email, role } })


On 401 (access token expired) — handled by Axios interceptor:
        │
        ▼
POST /api/auth/refresh   (sends httpOnly cookie automatically)
        │
        ▼
authService.refreshAccessToken(cookieToken)
        │
        ├── jwt.verify(cookieToken, JWT_REFRESH_SECRET)
        ├── User.findById(decoded.userId)
        ├── bcrypt.compare(cookieToken, user.refreshTokenHash)  → 401 if mismatch
        │
        └── New accessToken issued (15m)
            localStorage.setItem('accessToken', newToken)
            Retry original request


POST /api/auth/logout
        │
        ├── user.refreshTokenHash = null
        ├── user.save()
        └── res.clearCookie('refreshToken')
```

---

## Report Filtering

**Where:** `reportService.getFilteredReport(filters)`

DB-level filters (on Result collection): `company`, `fromDate`, `toDate`

Post-populate filters (applied in JS after .populate()): `branch`, `placementStatus`

The reason for split filtering: `branch` and `placementStatus` are on the Student document, not on Result. Post-populate filtering avoids a `$lookup + $match` aggregation pipeline while keeping the code simple for the data volumes involved (~500–5000 results per cycle).

Output shape per row:
```js
{
  studentId, studentName, branch,
  companyName,
  roundNumber, roundName,
  outcome, remarks,
  recordedAt
}
```

CSV export is handled entirely on the frontend (`utils/exportCSV.js`) using `Blob` + `URL.createObjectURL` — no server involvement needed.
