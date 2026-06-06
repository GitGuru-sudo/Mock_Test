# API Design & Backend Implementation

## Design Principles

- **RESTful** resource naming: nouns, plural, lowercase
- **Consistent response shape** — every endpoint returns the same envelope
- **Controllers are thin** — only HTTP concerns (read req, call service, send res)
- **Services own logic** — all business rules, cache ops, and DB queries
- **Validation first** — `express-validator` chains run before any service call
- **Errors are operational** — `ApiError` class carries `statusCode` and `isOperational: true`

---

## Standard Response Envelope

Every endpoint returns one of these two shapes:

```json
// Success
{
  "success": true,
  "message": "Students fetched successfully",
  "data": [...],
  "pagination": { "total": 60, "page": 1, "limit": 20, "totalPages": 3 }
}

// Error
{
  "success": false,
  "message": "Validation failed",
  "errors": ["email is required", "cgpa must be between 0 and 10"]
}

// Business rule violation
{
  "success": false,
  "message": "Student was not present in this session",
  "errors": [{ "code": "ATTENDANCE_GATE" }]
}
```

---

## HTTP Status Code Mapping

| Status | Meaning | Used for |
|---|---|---|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Mongoose CastError (invalid ObjectId) |
| 401 | Unauthorized | Missing/expired/invalid JWT |
| 403 | Forbidden | Role guard (admin required) |
| 404 | Not Found | Document not found |
| 409 | Conflict | Duplicate key (email, studentId) |
| 422 | Unprocessable | Validation failure OR business rule violation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Unexpected programmer errors |

---

## Middleware Stack

Every request passes through this chain in order:

```
CORS          → Origin whitelist check (CLIENT_URL env var)
cookieParser  → Parses httpOnly refresh token cookie
morgan        → HTTP request logging (dev format)
express.json  → Parses JSON body
protect.js    → JWT verification (skipped for /auth/login, /auth/refresh, /auth/register)
validate.js   → express-validator result check → 422 on failure
[controller]  → Calls service
errorHandler  → Last middleware, formats all thrown errors
```

---

## Authentication

**`protect.js` middleware:**

```
Authorization: Bearer <accessToken>  (required on all protected routes)
```

Attaches to `req.user`:
```js
{ userId: string, role: 'admin' | 'officer' | 'student', studentRef: ObjectId | null }
```

**Rate limiting** (`rateLimiter.js`):
- Applied only to `POST /api/auth/login`
- 10 requests per IP per 15 minutes
- Returns 429 with `{ success: false, message: 'Too many login attempts...' }`

---

## API Endpoints — Full Reference

### Auth — `/api/auth`

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/login` | No (rate-limited) | `{ email, password }` | Returns `{ accessToken, user }` + sets httpOnly refresh cookie |
| POST | `/register` | Yes (admin only) | `{ name, email, password, role? }` | Creates officer/admin account |
| POST | `/refresh` | No | — (reads cookie) | Issues new accessToken from refresh cookie |
| POST | `/logout` | Yes | — | Clears cookie, nulls refreshTokenHash in DB |

**Validation — login:** `email` must be valid email; `password` not empty

**Validation — register:** `name` required; `email` valid email; `password` min 6 chars

---

### Students — `/api/students`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Yes | Paginated list with filters |
| GET | `/:id` | Yes | Student detail |
| POST | `/` | Yes | Create student (auto-generates studentId) |
| PUT | `/:id` | Yes | Update student fields |
| DELETE | `/:id` | Yes | Soft delete (`isDeleted: true`) |

**Query params for GET `/`:**

| Param | Type | Example | Description |
|---|---|---|---|
| `page` | number | `1` | Page number (default: 1) |
| `limit` | number | `20` | Items per page (default: 20) |
| `search` | string | `John` | Name or email regex match |
| `branch` | string | `CSE` | Filter by branch |
| `placementStatus` | string | `placed` | Filter by status |
| `year` | number | `3` | Filter by year |

**Response — GET `/`:**
```json
{
  "success": true,
  "data": [ ...students ],
  "pagination": { "total": 60, "page": 1, "limit": 20, "totalPages": 3 }
}
```

**Validation — POST / PUT:**
- `name` required
- `email` valid email, unique
- `phone` matches `/^\d{10}$/`
- `branch` in enum `[CSE, ECE, ME, CE, EE, IT]`
- `year` integer 1–4
- `cgpa` float 0–10

**Note:** `studentId` and `isDeleted` cannot be set via POST/PUT — protected in service layer.

---

### Companies — `/api/companies`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Yes | List all companies (Redis-cached 60s) |
| GET | `/:id` | Yes | Company detail with all rounds |
| POST | `/` | Yes | Create company with rounds array |
| PUT | `/:id` | Yes | Update company fields |
| PATCH | `/:id/status` | Yes | Update `recruitmentStatus` |

**Validation — POST:**
- `name` required
- `ctc` positive number (optional)
- `rounds` non-empty array
- Each round: `roundName` required, `roundType` in enum

**Validation — PATCH status:**
- `recruitmentStatus` in `[upcoming, ongoing, completed]`

---

### Sessions — `/api/sessions`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Yes | List sessions with optional filters |
| GET | `/:id` | Yes | Session detail (company populated) |
| POST | `/` | Yes | Create session |
| PATCH | `/:id/status` | Yes | Update session status |
| GET | `/:id/eligible-students` | Yes | Students eligible for this session (with attendance/result state) |

**Query params for GET `/`:**

| Param | Description |
|---|---|
| `companyId` | Filter by company |
| `status` | Filter by status (`scheduled`, `completed`, `cancelled`) |
| `dateFrom` | Sessions from this ISO date |
| `dateTo` | Sessions up to this ISO date |

**`/eligible-students` response shape:**
```json
{
  "students": [
    {
      "student": { "_id", "studentId", "name", "branch", "cgpa", "placementStatus" },
      "attendance": { "status": "present", "markedAt": "...", "_id": "..." } | null,
      "existingResult": { "_id", "outcome", "remarks" } | null,
      "eligible": true,
      "reason": null
    }
  ]
}
```

---

### Attendance — `/api/attendance`

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/bulk` | Yes | `{ sessionId, records: [{ studentId, status }] }` | Bulk upsert attendance |
| GET | `/session/:sessionId` | Yes | — | All attendance records for a session |
| PATCH | `/:id` | Yes | `{ status }` | Update single attendance record |

**Bulk mark — validation:**
- `sessionId` required
- `records` non-empty array
- Each `studentId` not empty
- Each `status` in `[present, absent]`

**Idempotent:** Bulk mark uses `findOneAndUpdate({ upsert: true })` — calling twice with same data is safe.

---

### Results — `/api/results`

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/` | Yes | `{ sessionId, studentId, outcome, remarks? }` | Record result (enforces 3 business rules) |
| GET | `/session/:sessionId` | Yes | — | All results for a session |
| GET | `/student/:studentId` | Yes | — | All results for a student (sorted newest first) |
| PUT | `/:id` | Yes | `{ outcome?, remarks? }` | Update existing result (no gate re-checks) |

**Error codes on 422:**

| Code | Meaning |
|---|---|
| `ATTENDANCE_GATE` | Student was absent for this session |
| `ROUND_SEQUENCE` | Student did not pass the previous round |
| `ELIMINATED` | Student has a prior fail at this company |

**Validation — POST:**
- `sessionId` required
- `studentId` required
- `outcome` in `[pass, fail, offer, pending]`

---

### Dashboard — `/api/dashboard`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/stats` | Yes | Aggregated stats (Redis-cached 60s) |

**Response:**
```json
{
  "totalStudents": 60,
  "placedStudents": 18,
  "inProcessStudents": 24,
  "rejectedStudents": 5,
  "notPlacedStudents": 13,
  "totalCompanies": 6,
  "activeCompanies": 0,
  "todaySessions": [...],
  "placementByBranch": [
    { "_id": "CSE", "total": 15, "placed": 8 }
  ],
  "topRecruiters": [
    { "company": "Google", "offersCount": 5 }
  ]
}
```

---

### Reports — `/api/reports`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Yes | Filtered placement report |

**Query params:**

| Param | Description |
|---|---|
| `companyId` | Filter by company ObjectId |
| `branch` | Filter by branch (CSE, ECE, ...) |
| `placementStatus` | Filter by student status |
| `fromDate` | ISO date string |
| `toDate` | ISO date string |

**Response rows:**
```json
[
  {
    "studentId": "STU-001",
    "studentName": "Student 1",
    "branch": "CSE",
    "companyName": "Google",
    "roundNumber": 3,
    "roundName": "Technical Round",
    "outcome": "offer",
    "remarks": "Excellent DSA",
    "recordedAt": "2026-06-01T10:30:00.000Z"
  }
]
```

---

### Student Portal — `/api/portal`

All routes require a `student`-role JWT token.

| Method | Path | Description |
|---|---|---|
| GET | `/me` | Student's own profile |
| GET | `/me/attendance` | Student's attendance history |
| GET | `/me/results` | Student's result history |
| GET | `/me/timeline` | Interview timeline grouped by company |

---

## Error Handling Implementation

`errorHandler.js` (last middleware) handles all thrown errors:

| Error Type | Detection | HTTP Status | Message |
|---|---|---|---|
| Mongoose ValidationError | `err.name === 'ValidationError'` | 422 | Field validation messages array |
| Mongoose CastError | `err.name === 'CastError'` | 400 | "Invalid {path}: {value}" |
| MongoDB duplicate key | `err.code === 11000` | 409 | "Duplicate value for {field}" |
| JWT invalid | `err.name === 'JsonWebTokenError'` | 401 | "Invalid token" |
| JWT expired | `err.name === 'TokenExpiredError'` | 401 | "Token expired" |
| Custom ApiError | `err.isOperational === true` | `err.statusCode` | `err.message` |
| Unknown / crash | fallback | 500 | "Internal server error" |

**ApiError class** (`server/src/utils/ApiError.js`):
```js
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    this.errors = errors
  }
}
```

Never throws raw `Error` objects in services — always `throw new ApiError(statusCode, message, errors[])`.

---

## Validation Implementation

`validate.js` middleware runs after every `express-validator` chain:

```js
function validate(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => e.msg)
    })
  }
  next()
}
```

Used in routes like:
```js
router.post('/', protect, [
  body('email').isEmail(),
  body('cgpa').isFloat({ min: 0, max: 10 }),
  validate          // ← runs after all validators
], controller.create)
```
