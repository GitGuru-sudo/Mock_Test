# Error Handling & Validation

## Error Handling Strategy

The system uses a **centralized error handling** pattern. All errors — whether from business logic, Mongoose, JWT, or uncaught crashes — flow to a single `errorHandler` middleware at the end of the Express chain.

### Custom ApiError Class

`server/src/utils/ApiError.js`

```js
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true  // marks this as an expected, user-facing error
    this.errors = errors       // optional array of { code, field, message }
  }
}
```

**`isOperational: true`** is the key flag. The error handler uses this to distinguish:
- **Operational errors** (expected: 401, 403, 404, 422) → send structured JSON response
- **Programmer errors** (unexpected: null pointer, unhandled promise) → log to console + send 500

### Error Handler Middleware

`server/src/middleware/errorHandler.js` — registered as the last middleware in `index.js`.

| Error Type | Detection | Status | Response |
|---|---|---|---|
| `Mongoose ValidationError` | `err.name === 'ValidationError'` | 422 | Field messages from `err.errors` |
| `Mongoose CastError` | `err.name === 'CastError'` | 400 | "Invalid {path}: {value}" |
| MongoDB duplicate key | `err.code === 11000` | 409 | "Duplicate value for {field}" |
| `JsonWebTokenError` | `err.name === 'JsonWebTokenError'` | 401 | "Invalid token" |
| `TokenExpiredError` | `err.name === 'TokenExpiredError'` | 401 | "Token expired" |
| `ApiError` | `err.isOperational === true` | `err.statusCode` | `err.message` + `err.errors` |
| Unknown crash | fallback | 500 | "Internal server error" (no leak) |

For 500 errors, the full error is logged to console but **never sent to the client**. This prevents leaking stack traces, internal paths, or DB connection strings in production.

---

## Validation

### Backend — express-validator

All write endpoints have validator chains defined inline in route files, followed by the `validate` middleware:

```js
router.post('/', protect, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('cgpa').isFloat({ min: 0, max: 10 }).withMessage('CGPA must be 0–10'),
  body('branch').isIn(['CSE','ECE','ME','CE','EE','IT']).withMessage('Invalid branch'),
  validate   // ← checks validationResult, returns 422 if any fail
], controller.create)
```

`validate.js` middleware:
```js
const errors = validationResult(req)
if (!errors.isEmpty()) {
  return res.status(422).json({
    success: false,
    message: 'Validation failed',
    errors: errors.array().map(e => e.msg)
  })
}
next()
```

### Validation Rules Per Resource

**Auth:**
- `email` — valid email format
- `password` — minimum 6 characters
- `name` — required, non-empty

**Student:**
- `name` — required
- `email` — valid email, unique (409 on duplicate)
- `phone` — exactly 10 digits (`/^\d{10}$/`)
- `branch` — enum `[CSE, ECE, ME, CE, EE, IT]`
- `year` — integer 1–4
- `cgpa` — float 0.0–10.0

**Company:**
- `name` — required
- `ctc` — positive number (optional)
- `rounds` — non-empty array
- Each round: `roundName` required, `roundType` in enum

**Session:**
- `company` — required (ObjectId)
- `roundNumber` — integer ≥ 1
- `roundName` — required
- `roundType` — enum `[aptitude, technical, coding, gd, hr]`
- `scheduledDate` — valid ISO 8601 date

**Attendance (bulk):**
- `sessionId` — required
- `records` — non-empty array
- Each `studentId` — required
- Each `status` — enum `[present, absent]`

**Results:**
- `sessionId` — required
- `studentId` — required
- `outcome` — enum `[pass, fail, offer, pending]`

### Mongoose Schema Validation

An additional layer of validation exists at the Mongoose schema level. Even if a request bypasses express-validator (e.g., via direct DB scripts), Mongoose enforces:

- `required` fields
- `enum` values
- `min`/`max` for Number fields
- `match` regex for phone
- `unique` indexes (handled as 11000 duplicate key errors)

---

## Business Rule Violations — 422 Errors

Business rule violations use `422 Unprocessable Entity` with a machine-readable `code` in the errors array:

```json
{
  "success": false,
  "message": "Student was not present in this session",
  "errors": [{ "code": "ATTENDANCE_GATE" }]
}
```

| Code | HTTP | Meaning |
|---|---|---|
| `ATTENDANCE_GATE` | 422 | Student absent for this session |
| `ROUND_SEQUENCE` | 422 | Did not pass previous round |
| `ELIMINATED` | 422 | Has a prior fail at this company |

The frontend Results page reads these codes and shows specific user-friendly toast messages instead of the raw error message.

---

## Frontend Error Handling

### API Error Display

All API calls are wrapped in try/catch. Errors are displayed via `react-hot-toast`:

```js
try {
  await mutation.mutateAsync(data)
  toast.success('Saved successfully')
} catch (err) {
  toast.error(err.response?.data?.message || 'Something went wrong')
}
```

### Business Rule Codes on Results Page

```js
const msg = err.response?.data?.errors?.[0]?.code
if (msg === 'ATTENDANCE_GATE') toast.error('Student was absent for this session')
else if (msg === 'ROUND_SEQUENCE') toast.error('Student has not passed the previous round')
else if (msg === 'ELIMINATED') toast.error('Student has been eliminated from this company')
else toast.error(err.response?.data?.message || 'Failed to save result')
```

### 401 Auto-Refresh

401 responses trigger automatic token refresh via the Axios response interceptor (see `axiosInstance.js`). If refresh fails, the user is redirected to `/login`. This is transparent to the user — they only see the login page if their session has truly expired.

### React Query Error States

React Query surfaces errors via `isError` and `error` from `useQuery`. Most pages show `EmptyState` on error rather than crashing:

```jsx
if (isError) return <EmptyState message="Failed to load data" />
```

---

## Rate Limiting

**Where:** `server/src/middleware/rateLimiter.js` → applied to `POST /api/auth/login` only

**Config:**
- 10 requests per IP per 15 minutes
- Implementation: `express-rate-limit` with in-memory store
- Custom handler returns structured JSON (not the default HTML response)

```json
{
  "success": false,
  "message": "Too many login attempts. Please try again after 15 minutes."
}
```

HTTP status: `429 Too Many Requests`

Standard headers (`RateLimit-*`) are sent so clients can read the limit and reset time.
