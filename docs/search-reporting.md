# Search, Reporting & Analytics

## Student Search & Filtering

**Endpoint:** `GET /api/students`

**Implementation:** `studentService.listStudents(filters, page, limit)`

The student list supports multi-dimensional filtering with full-text search, all backed by MongoDB queries (not client-side filtering):

### Search

```js
// Name or email regex match — case-insensitive
if (filters.search) {
  const regex = new RegExp(filters.search, 'i')
  query.$or = [{ name: regex }, { email: regex }]
}
```

Debounced 300ms on the frontend to avoid API calls on every keystroke.

### Filters

| Filter | MongoDB Field | Type |
|---|---|---|
| Branch | `branch` | Exact enum match |
| Placement Status | `placementStatus` | Exact enum match |
| Year | `year` | Exact number match |

All filters compose with `$and` semantics (implicit in MongoDB object query syntax).

### Pagination

```js
const skip = (page - 1) * limit
Student.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
```

Returns pagination metadata: `{ total, page, limit, totalPages }`.

### Redis Cache for Student Lists

Every unique combination of filters + page + limit is cached separately:

```js
const hash = JSON.stringify({ ...filters, page, limit })
const cacheKey = `students:list:${hash}`
// TTL: 30 seconds
```

On any student mutation (create/update/delete), all `students:list:*` keys are scanned and deleted — ensuring fresh data immediately after a change.

---

## Session Eligibility Query

**Endpoint:** `GET /api/sessions/:id/eligible-students`

**Implementation:** `sessionService.getEligibleStudents(sessionId)`

This is the most complex read query in the system — it joins data across 3 collections (Student, Attendance, Result) and applies round-based eligibility logic:

```
1. Load all active students (isDeleted: false)                    ← O(N)
2. Load all Attendance records for this session                   ← O(attendanceCount)
3. Load all Result records for this company                       ← O(resultCount)
4. Build in-memory index: attendanceByStudentId                   ← O(N)
5. Build in-memory index: resultsByStudentId[roundNumber]         ← O(R)
6. For each student, compute eligibility:
   - failedRound = any result with outcome: 'fail' → ineligible
   - if roundNumber > 1: check priorRoundResult.outcome === 'pass'
   - attach existing attendance and result inline
7. Return { session, students: rows[] }
```

The in-memory join approach is used because the data volume per session is bounded (60–500 students typically), making this faster than a multi-stage aggregation pipeline for this use case.

---

## Reports

**Endpoint:** `GET /api/reports`

**Implementation:** `reportService.getFilteredReport(filters)`

### DB-Level Filtering (on Result collection)

```js
const query = {}
if (filters.companyId) query.company = filters.companyId
if (filters.fromDate || filters.toDate) {
  query.recordedAt = {}
  if (filters.fromDate) query.recordedAt.$gte = new Date(filters.fromDate)
  if (filters.toDate)   query.recordedAt.$lte = new Date(filters.toDate)
}
```

### Post-Populate Filtering

After `.populate('student')`, filter in JavaScript:

```js
if (filters.branch)
  results = results.filter(r => r.student?.branch === filters.branch)
if (filters.placementStatus)
  results = results.filter(r => r.student?.placementStatus === filters.placementStatus)
```

Branch and placementStatus are on the Student document — filtering them at DB level would require a `$lookup` aggregation. For the expected data volume (~500–5000 results per cycle), post-populate filtering in JS is simpler and fast enough.

### Output

Flat array of report rows ready for table display and CSV export:

```json
[
  {
    "studentId": "STU-001",
    "studentName": "Rahul Sharma",
    "branch": "CSE",
    "companyName": "Google",
    "roundNumber": 3,
    "roundName": "Technical Round",
    "outcome": "offer",
    "remarks": "Strong DSA",
    "recordedAt": "2026-06-01T10:30:00Z"
  }
]
```

### CSV Export (Frontend)

`client/src/utils/exportCSV.js` — pure client-side, no server call:

```
columns = ['Student ID', 'Name', 'Branch', 'Company', 'Round', 'Outcome', 'Remarks', 'Date']
rows    = data.map(r => [r.studentId, r.studentName, ...])
csv     = header + rows.join('\n')
blob    = new Blob([csv], { type: 'text/csv' })
url     = URL.createObjectURL(blob)
<a href=url download="placement-report-{timestamp}.csv"> trigger click
```

Fields with commas or quotes are wrapped in double quotes per RFC 4180.

---

## Dashboard Analytics

**Endpoint:** `GET /api/dashboard/stats`

**Implementation:** `dashboardService.getStats()` with Redis cache-aside (60s TTL)

### Aggregation 1 — Student Status Counts

```js
Student.aggregate([
  { $match: { isDeleted: false } },
  { $group: { _id: '$placementStatus', count: { $sum: 1 } } }
])
// → [{ _id: 'placed', count: 18 }, { _id: 'in_process', count: 24 }, ...]
```

### Aggregation 2 — Placement by Branch

```js
Student.aggregate([
  { $match: { isDeleted: false } },
  { $group: {
      _id: '$branch',
      total: { $sum: 1 },
      placed: { $sum: { $cond: [{ $eq: ['$placementStatus', 'placed'] }, 1, 0] } }
  }}
])
// → [{ _id: 'CSE', total: 15, placed: 8 }, ...]
```

Drives the bar chart on the Dashboard page (Total bar + Placed bar per branch).

### Aggregation 3 — Top Recruiters

```js
Result.aggregate([
  { $match: { outcome: 'offer' } },
  { $group: { _id: '$company', offersCount: { $sum: 1 } } },
  { $sort: { offersCount: -1 } },
  { $limit: 5 },
  { $lookup: { from: 'companies', localField: '_id', foreignField: '_id', as: 'company' } },
  { $unwind: '$company' },
  { $project: { _id: 0, company: '$company.name', offersCount: 1 } }
])
// → [{ company: 'Google', offersCount: 5 }, ...]
```

### Aggregation 4 — Today's Sessions

```js
InterviewSession.find({
  scheduledDate: { $gte: todayStart, $lte: todayEnd },
  status: 'scheduled'
}).populate('company', 'name')
```

### Redis Cache

All 4 aggregations run only on cache miss. Result is stored as JSON string with 60s TTL. The frontend React Query hook uses `refetchInterval: 60_000` to match the server TTL.

Cache is invalidated (key deleted) whenever:
- A Result is recorded or updated
- Attendance is marked
