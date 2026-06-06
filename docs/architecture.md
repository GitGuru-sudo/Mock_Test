# Application Architecture & Project Structure

## System Architecture Overview

Campus Interview Tracker follows a **3-tier architecture**: React SPA (presentation) → Express REST API (application logic) → MongoDB Atlas + Upstash Redis (data layer). The frontend and backend are completely decoupled and deployed independently.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Vercel)                          │
│                                                                 │
│   React 18 + Vite                                               │
│   ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│   │  Pages   │  │ React Query  │  │    AuthContext            │ │
│   │  (8 + 1) │  │  (cache +    │  │  (JWT token storage,     │ │
│   │          │  │   mutations) │  │   login/logout state)    │ │
│   └──────────┘  └──────────────┘  └──────────────────────────┘ │
│          │              │                      │                │
│          └──────────────┴──────────────────────┘                │
│                         │                                       │
│              Axios Interceptor Layer                            │
│              (auto token attach + auto refresh on 401)         │
└─────────────────────────────┬───────────────────────────────────┘
                              │  HTTPS  (Bearer token)
                              │  /api/* proxy → EC2:5000
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVER (AWS EC2 — PM2)                       │
│                                                                 │
│   Express.js + Node.js 20                                       │
│                                                                 │
│   ┌────────────┐   ┌────────────┐   ┌──────────────────────┐  │
│   │  Routes    │   │Controllers │   │     Services         │  │
│   │  (9 files) │──▶│ (thin HTTP)│──▶│  (all business logic)│  │
│   └────────────┘   └────────────┘   └──────────────────────┘  │
│                                               │                 │
│   ┌─────────────────────────────────────────┐ │                 │
│   │           Middleware Stack              │ │                 │
│   │  CORS → cookieParser → morgan → json   │ │                 │
│   │  protect.js → validate.js → errorHandler│ │                 │
│   └─────────────────────────────────────────┘ │                 │
└───────────────────────────────────────────────┼─────────────────┘
                                                │
                    ┌───────────────────────────┼──────────────┐
                    │                           │              │
                    ▼                           ▼              │
        ┌───────────────────┐    ┌────────────────────────┐   │
        │  MongoDB Atlas    │    │   Upstash Redis         │   │
        │  (primary store)  │    │   (REST API cache)      │   │
        │                   │    │                         │   │
        │  6 collections:   │    │  dashboard:stats  60s   │   │
        │  users            │    │  students:list:*  30s   │   │
        │  students         │    │  company:list     60s   │   │
        │  companies        │    │                         │   │
        │  interviewsessions│    └────────────────────────┘   │
        │  attendances      │                                   │
        │  results          │                                   │
        └───────────────────┘                                   │
```

---

## Request Lifecycle

```
Browser Request
      │
      ▼
Axios (client/src/api/axiosInstance.js)
  ├─ Attaches: Authorization: Bearer <accessToken>
  ├─ withCredentials: true  (sends httpOnly refresh cookie)
  └─ On 401 → auto calls /api/auth/refresh → retries original request
      │
      ▼
Vite Dev Proxy (local) / Direct URL (production)
      │
      ▼
Express Middleware Pipeline
  1. CORS           → validates Origin header
  2. cookieParser   → parses refresh token cookie
  3. morgan         → HTTP request logging
  4. express.json() → parses request body
  5. protect.js     → verifies JWT, attaches req.user = { userId, role }
      │
      ▼
Route Handler → Controller (HTTP only)
      │
      ▼
Service Layer (business logic)
  ├─ Redis check (cache-aside)
  ├─ MongoDB query / aggregate
  ├─ Cache write
  └─ Redis invalidation on mutations
      │
      ▼
Standard JSON Response
  Success: { success: true, message, data, pagination? }
  Error:   { success: false, message, errors[] }
```

---

## Project Structure — Annotated

```
campus-interview-tracker/
│
├── .github/
│   └── workflows/
│       └── deploy.yml              ← Single CI/CD file: backend + frontend
│
├── client/                         ← React 18 SPA (deployed to Vercel)
│   ├── src/
│   │   ├── api/
│   │   │   ├── axiosInstance.js    ← Axios with request/response interceptors
│   │   │   ├── auth.js             ← login, logout, register, refresh
│   │   │   ├── students.js         ← list, getById, create, update, delete
│   │   │   ├── companies.js        ← list, getById, create, update, status
│   │   │   ├── sessions.js         ← list, getById, create, status, eligibleStudents
│   │   │   ├── attendance.js       ← bulkMark, getBySession, update
│   │   │   ├── results.js          ← record, getBySession, getByStudent, update
│   │   │   ├── dashboard.js        ← getStats
│   │   │   └── reports.js          ← get (with filters)
│   │   │
│   │   ├── components/
│   │   │   ├── animated/           ← Framer Motion: Aurora, BlurText, RotatingText,
│   │   │   │                           AnimatedNumber, FadeContent, Ripple, etc.
│   │   │   ├── layout/
│   │   │   │   ├── Layout.jsx      ← Sidebar + Navbar shell with <Outlet />
│   │   │   │   ├── Sidebar.jsx     ← Navigation links, active state, role badge
│   │   │   │   └── Navbar.jsx      ← Page title, user name, logout button
│   │   │   └── ui/
│   │   │       ├── StatusBadge.jsx ← Color-coded badge for status strings
│   │   │       ├── ConfirmDialog.jsx← AlertDialog wrapper for delete confirmation
│   │   │       ├── EmptyState.jsx  ← Consistent empty-data placeholder
│   │   │       ├── button.jsx      ← Tailwind button variants
│   │   │       ├── card.jsx        ← Card + CardHeader + CardContent
│   │   │       ├── badge.jsx       ← Generic badge
│   │   │       ├── input.jsx       ← Styled input
│   │   │       ├── select.jsx      ← Styled select
│   │   │       ├── skeleton.jsx    ← Animated loading skeleton
│   │   │       ├── dialog.jsx      ← Modal dialog
│   │   │       └── alert-dialog.jsx← Confirmation dialog
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx     ← user, accessToken, login(), logout(),
│   │   │                               isAuthenticated, isLoading
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.js          ← useContext(AuthContext) wrapper
│   │   │   ├── useStudents.js      ← useQuery + useMutation for students
│   │   │   ├── useCompanies.js     ← useQuery + useMutation for companies
│   │   │   ├── useSessions.js      ← useQuery + useMutation for sessions
│   │   │   ├── useAttendance.js    ← useQuery + useBulkMarkAttendance
│   │   │   ├── useResults.js       ← useQuery + useRecordResult
│   │   │   └── useDashboardStats.js← useQuery with refetchInterval: 60s
│   │   │
│   │   ├── lib/
│   │   │   └── utils.js            ← cn() = clsx + tailwind-merge
│   │   │
│   │   ├── pages/
│   │   │   ├── Login.jsx           ← Public. Aurora animated login form
│   │   │   ├── Dashboard.jsx       ← Stat cards, bar chart, pie chart, sessions table
│   │   │   ├── Students.jsx        ← Searchable/filterable table, drawer timeline
│   │   │   ├── Companies.jsx       ← Card grid, dynamic round builder modal
│   │   │   ├── CompanyDetail.jsx   ← Company info + rounds + sessions list
│   │   │   ├── Sessions.jsx        ← Sessions grouped by date, status update
│   │   │   ├── Attendance.jsx      ← Session picker → eligible student list → bulk mark
│   │   │   ├── Results.jsx         ← Session picker → present students → outcome entry
│   │   │   ├── Reports.jsx         ← Filter panel + results table + CSV export
│   │   │   └── StudentDashboard.jsx← Student portal: profile + interview timeline
│   │   │
│   │   ├── utils/
│   │   │   ├── formatDate.js       ← date-fns formatters: formatDate, formatDateTime
│   │   │   ├── exportCSV.js        ← Blob/URL.createObjectURL CSV download
│   │   │   └── statusColor.js      ← status string → Tailwind color class
│   │   │
│   │   ├── App.jsx                 ← Router tree with ProtectedRoute / AdminRoute
│   │   ├── main.jsx                ← QueryClientProvider + BrowserRouter + AuthContextProvider
│   │   └── index.css               ← Tailwind directives + CSS variable theme
│   │
│   ├── vite.config.js              ← Port 3000, proxy /api → localhost:5000
│   ├── tailwind.config.js          ← Content paths, color tokens from CSS vars
│   ├── postcss.config.js
│   ├── .env                        ← VITE_API_URL=/api  (gitignored)
│   └── .env.example                ← Template (committed)
│
├── server/                         ← Express REST API (deployed to AWS EC2)
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js               ← mongoose.connect() with 5-retry logic
│   │   │   ├── redis.js            ← Upstash Redis client (@upstash/redis)
│   │   │   └── env.js              ← validateEnv() — throws on missing secrets
│   │   │
│   │   ├── controllers/            ← HTTP-only layer: read req, call service, send res
│   │   │   ├── authController.js
│   │   │   ├── studentsController.js
│   │   │   ├── companiesController.js
│   │   │   ├── sessionsController.js
│   │   │   ├── attendanceController.js
│   │   │   ├── resultsController.js
│   │   │   └── dashboardController.js
│   │   │
│   │   ├── middleware/
│   │   │   ├── protect.js          ← JWT verify → attaches req.user
│   │   │   ├── validate.js         ← express-validator result checker → 422
│   │   │   ├── errorHandler.js     ← Global error formatter (last middleware)
│   │   │   ├── rateLimiter.js      ← express-rate-limit: 10 req/15min per IP
│   │   │   ├── requireAdmin.js     ← role guard: admin only
│   │   │   └── requireStudent.js   ← role guard: student only
│   │   │
│   │   ├── models/                 ← Mongoose schemas + indexes
│   │   │   ├── User.js
│   │   │   ├── Student.js
│   │   │   ├── Company.js
│   │   │   ├── InterviewSession.js
│   │   │   ├── Attendance.js
│   │   │   └── Result.js
│   │   │
│   │   ├── routes/                 ← Express routers: validators + controller dispatch
│   │   │   ├── auth.js             → /api/auth
│   │   │   ├── students.js         → /api/students
│   │   │   ├── companies.js        → /api/companies
│   │   │   ├── sessions.js         → /api/sessions
│   │   │   ├── attendance.js       → /api/attendance
│   │   │   ├── results.js          → /api/results
│   │   │   ├── dashboard.js        → /api/dashboard
│   │   │   ├── reports.js          → /api/reports
│   │   │   └── studentPortal.js    → /api/portal
│   │   │
│   │   ├── services/               ← All business logic — never called from routes directly
│   │   │   ├── authService.js      ← register, login, refreshAccessToken, logout
│   │   │   ├── studentService.js   ← CRUD + cache invalidation + timeline aggregation
│   │   │   ├── companyService.js   ← CRUD + Redis company:list cache
│   │   │   ├── sessionService.js   ← CRUD + getEligibleStudents (round gating logic)
│   │   │   ├── attendanceService.js← bulkMarkAttendance + wasPresent() + in-process trigger
│   │   │   ├── resultService.js    ← recordResult() with 3-gate enforcement
│   │   │   ├── dashboardService.js ← getStats() cache-aside aggregation
│   │   │   └── reportService.js    ← getFilteredReport() with post-populate filtering
│   │   │
│   │   ├── utils/
│   │   │   └── ApiError.js         ← Custom error class: statusCode + isOperational
│   │   │
│   │   └── index.js                ← App entry: middleware → routes → error handler → listen
│   │
│   ├── seed.js                     ← Idempotent DB seed: clears + creates full dataset
│   ├── Dockerfile                  ← node:20-alpine, EXPOSE 5000
│   ├── .env                        ← Real secrets (gitignored)
│   └── .env.example                ← Template (committed)
│
├── docker-compose.yml              ← backend service, port 5000, reads server/.env
├── .gitignore                      ← Ignores .env, node_modules, dist, .kiro
└── README.md
```

---

## Technology Decisions

| Decision | Choice | Reason |
|---|---|---|
| Frontend build tool | Vite | Fast HMR, native ESM, small bundle |
| State management | React Query v5 | Server state with caching, background refetch, mutations |
| Styling | Tailwind CSS | Utility-first, no runtime overhead |
| Animation | Framer Motion | Smooth page transitions and animated numbers |
| HTTP client | Axios | Interceptors for token attach and auto-refresh |
| Cache | Upstash Redis (REST) | Serverless-friendly, no TCP connection needed, free tier |
| DB ODM | Mongoose 8 | Schema validation, virtual populate, compound indexes |
| Auth | JWT dual-token | Access token in memory (15m) + httpOnly refresh cookie (7d) |
| Password hashing | bcryptjs (rounds=12) | Industry standard, not native addon |
| Rate limiting | express-rate-limit | Protects login from brute-force |
| Backend process | PM2 | Zero-downtime reloads, auto-restart on crash |
