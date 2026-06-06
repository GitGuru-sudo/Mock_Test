# Database Design & Data Modeling

## Overview

The system uses **MongoDB Atlas** (cloud-hosted MongoDB) with **Mongoose 8** as the ODM. The database is named `campus-interview-tracker` and contains 6 collections. The schema design prioritizes:

- Denormalization of frequently-queried fields (company + roundNumber on Attendance and Result)
- Compound indexes on high-traffic query patterns
- Soft delete on Student (preserves audit history)
- Bcrypt-hashed tokens (never store raw JWT refresh tokens)

---

## Entity Relationship Diagram

```
User
 ├── role: admin | officer | student
 ├── refreshTokenHash (bcrypt of refresh JWT)
 └── studentRef ──────────────────────────────┐
                                              │
Student ◄─────────────────────────────────────┘
 ├── studentId (STU-001 ... STU-NNN)
 ├── branch: CSE | ECE | ME | CE | EE | IT
 ├── placementStatus: not_placed | in_process | placed | rejected
 └── isDeleted (soft delete flag)

Company
 └── rounds[] (embedded sub-documents)
      ├── roundNumber
      ├── roundName
      └── roundType: aptitude | technical | coding | gd | hr

InterviewSession
 ├── company ──────────────────────────────── ref: Company
 ├── roundNumber
 └── status: scheduled | completed | cancelled

Attendance
 ├── session ──────────────────────────────── ref: InterviewSession
 ├── student ──────────────────────────────── ref: Student
 ├── company ──────────────────────────────── ref: Company  (denormalized)
 ├── roundNumber                               (denormalized)
 └── status: present | absent
     UNIQUE INDEX: { session, student }

Result
 ├── session ──────────────────────────────── ref: InterviewSession
 ├── student ──────────────────────────────── ref: Student
 ├── company ──────────────────────────────── ref: Company  (denormalized)
 ├── roundNumber                               (denormalized)
 └── outcome: pass | fail | offer | pending
     UNIQUE INDEX: { session, student }
```

---

## Schemas — Complete Specification

### User

```js
{
  name:             String   required trim
  email:            String   required unique lowercase trim
  password:         String   required                  // bcrypt hash (rounds=12)
  role:             String   enum[admin, officer, student]  default: officer
  studentRef:       ObjectId ref:Student  default: null  // populated for student role
  refreshTokenHash: String   default: null              // bcrypt hash of refresh JWT
  createdAt:        Date     auto (timestamps: true)
  updatedAt:        Date     auto (timestamps: true)
}
```

**Security notes:**
- Raw password is never stored — bcrypt hash only
- Raw refresh token is never stored — bcrypt hash only
- On logout: `refreshTokenHash` is set to `null`
- On refresh: `bcrypt.compare(cookieToken, user.refreshTokenHash)` must return true

---

### Student

```js
{
  studentId:        String   required unique            // auto-generated: STU-001
  name:             String   required trim
  email:            String   required unique lowercase trim
  phone:            String   required  match: /^\d{10}$/
  branch:           String   required  enum[CSE, ECE, ME, CE, EE, IT]
  year:             Number   required  min:1 max:4
  cgpa:             Number   required  min:0 max:10
  resumeUrl:        String   optional
  placementStatus:  String   enum[not_placed, in_process, placed, rejected]  default: not_placed
  userId:           ObjectId ref:User  default: null
  isDeleted:        Boolean  default: false             // soft delete
  createdAt:        Date     auto
  updatedAt:        Date     auto
}

Indexes:
  Compound: { isDeleted: 1, branch: 1, placementStatus: 1 }
  → Covers the most common list query pattern
```

**Soft delete:** `DELETE /api/students/:id` sets `isDeleted: true`. All service queries include `{ isDeleted: false }` filter. Attendance and Result records for deleted students are preserved for historical reporting.

**Auto-generated studentId:** `studentService.createStudent()` queries `Student.countDocuments()`, increments, formats as `STU-NNN` with collision check loop for concurrent-safe generation.

---

### Company

```js
{
  name:               String  required trim
  description:        String  optional
  industry:           String  optional
  website:            String  optional
  ctc:                Number  min:0    // in LPA
  location:           String  optional
  rounds: [{                          // EMBEDDED sub-documents
    roundNumber: Number required
    roundName:   String required trim
    roundType:   String required enum[aptitude, technical, coding, gd, hr]
    description: String optional
  }]
  recruitmentStatus:  String  enum[upcoming, ongoing, completed]  default: upcoming
  createdAt:          Date    auto
  updatedAt:          Date    auto
}
```

**Design choice — embedded rounds:** Interview rounds are embedded inside Company (not a separate collection) because:
- Rounds are always fetched with their company
- Rounds don't change independently of the company
- Avoids an extra join for the most common read path

---

### InterviewSession

```js
{
  company:       ObjectId  ref:Company  required
  roundNumber:   Number    required  min:1
  roundName:     String    required
  roundType:     String    required  enum[aptitude, technical, coding, gd, hr]
  scheduledDate: Date      required
  venue:         String    optional
  status:        String    enum[scheduled, completed, cancelled]  default: scheduled
  createdAt:     Date      auto
  updatedAt:     Date      auto
}

Indexes:
  { company: 1, scheduledDate: -1 }
  → Covers company-filtered session list sorted by date (CompanyDetail page)
```

---

### Attendance

```js
{
  session:     ObjectId  ref:InterviewSession  required
  student:     ObjectId  ref:Student           required
  company:     ObjectId  ref:Company           required  // denormalized for faster queries
  roundNumber: Number    required                        // denormalized
  status:      String    required  enum[present, absent]
  markedAt:    Date      default: Date.now
}

Indexes:
  UNIQUE COMPOUND: { session: 1, student: 1 }
  → Prevents duplicate attendance records; enables upsert semantics for bulk marking
```

**Denormalization:** `company` and `roundNumber` are stored directly (instead of only on the session) to enable fast queries like "all attendance records for a company in round N" without an extra join.

**Upsert semantics:** `bulkMarkAttendance()` uses `findOneAndUpdate({ upsert: true })` — idempotent, safe to call multiple times.

---

### Result

```js
{
  session:     ObjectId  ref:InterviewSession  required
  student:     ObjectId  ref:Student           required
  company:     ObjectId  ref:Company           required  // denormalized
  roundNumber: Number    required                        // denormalized
  outcome:     String    enum[pass, fail, offer, pending]  default: pending
  remarks:     String    optional
  recordedAt:  Date      default: Date.now
}

Indexes:
  UNIQUE COMPOUND: { session: 1, student: 1 }
  → Prevents duplicate results per session per student
  → Catches race conditions at the DB layer
```

---

## Query Patterns & Index Coverage

| Query | Filter | Index Used |
|---|---|---|
| List students | `{ isDeleted: false, branch, placementStatus }` | `{ isDeleted:1, branch:1, placementStatus:1 }` |
| Sessions by company | `{ company, scheduledDate }` | `{ company:1, scheduledDate:-1 }` |
| Attendance for session | `{ session, student }` | UNIQUE compound index |
| Results for student+company | `{ student, company, roundNumber, outcome }` | UNIQUE index + MongoDB default `_id` |
| Dashboard stats | `{ isDeleted: false }` → aggregate `$group` | Compound student index |

---

## Redis Cache Layer

The cache layer uses **Upstash Redis REST API** (`@upstash/redis`). The client is initialized in `server/src/config/redis.js` and exported as a singleton.

### Cache Keys

| Key Pattern | TTL | Stores |
|---|---|---|
| `dashboard:stats` | 60 seconds | Full DashboardStats object (JSON) |
| `students:list:<hash>` | 30 seconds | Paginated student list + total count |
| `company:list` | 60 seconds | Full company array (JSON) |

The `<hash>` in `students:list:<hash>` is `JSON.stringify(queryParams)` — unique per combination of page, limit, search, branch, placementStatus, year.

### Invalidation Strategy

| Event | Keys Invalidated |
|---|---|
| Student create / update / delete | All `students:list:*` keys (wildcard scan + delete) |
| Result recorded or updated | `dashboard:stats` |
| Attendance marked | `dashboard:stats` |
| Company create / update | `company:list` |

### Graceful Degradation

If Redis is unavailable (env vars missing or network issue), `redis` module exports `null`. All cache operations use optional chaining (`redis?.get(...)`) — the application continues serving requests from MongoDB with no downtime, just without caching.

---

## Data Volume — Seed Baseline

| Collection | Seed Count | Growth Pattern |
|---|---|---|
| users | 2 | Slow (admin-created only) |
| students | 60 | Batch per semester |
| companies | 6 | ~5–20 per cycle |
| interviewsessions | 23 | ~3–5 per company per cycle |
| attendances | ~663 | 60 students × sessions × 80% |
| results | ~526 | Subset of attendance (present only) |

---

## Placement Status State Machine

```
           [First round attended]
not_placed ──────────────────────► in_process
                                       │
                          [offer recorded]
                                       ├──────────────► placed
                          [all rounds failed]
                                       └──────────────► rejected (manual)
```

Status transitions are enforced **in the service layer** (`attendanceService.bulkMarkAttendance` for `in_process`, `resultService.recordResult` for `placed`). The `rejected` status is set manually by a placement officer.
