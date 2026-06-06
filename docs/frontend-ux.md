# Frontend Functionality & User Experience

## Architecture Overview

The frontend is a React 18 SPA built with Vite. It uses:

- **React Query v5** for all server state (fetching, caching, mutations, background refetch)
- **React Router v6** for client-side routing with nested routes
- **Framer Motion** for page transitions and animated UI elements
- **Tailwind CSS** for styling with CSS custom property theming
- **Axios** with interceptors for token management and auto-refresh

---

## State Management Strategy

| State Type | Where Stored | Why |
|---|---|---|
| Server data (students, companies, etc.) | React Query cache | Automatic background refetch, stale-while-revalidate |
| Auth state (user, token) | `AuthContext` + localStorage | Needs to persist across page refresh |
| UI state (modals open, selected filters) | Local `useState` per component | Component-local, no need for global store |
| Form state | Local `useState` per form | Controlled inputs |

There is no Redux, Zustand, or global state library — React Query + Context is sufficient for this domain.

---

## AuthContext

`client/src/context/AuthContext.jsx`

Provides to every component:

| Value | Type | Description |
|---|---|---|
| `user` | `{ userId, role, name, email }` \| `null` | Decoded from JWT on mount |
| `accessToken` | `string` \| `null` | Current access token |
| `login(email, password)` | `async function` | Calls `/api/auth/login`, stores token, decodes user |
| `logout()` | `async function` | Calls `/api/auth/logout`, clears localStorage |
| `isAuthenticated` | `boolean` | `!!user` |
| `isLoading` | `boolean` | True during initial token validation on mount |

On mount, the context reads `localStorage.getItem('accessToken')`, decodes the JWT payload (client-side decode only — no verification), checks `exp` field, and sets `user` if not expired. If expired, the token is cleared.

---

## Axios Interceptor — Auto Token Refresh

`client/src/api/axiosInstance.js`

**Request interceptor:** Attaches `Authorization: Bearer <token>` to every request (except `/auth/login` and `/auth/refresh` to avoid circular issues).

**Response interceptor:**
```
Response received with status 401
    │
    ├─ Is this the /auth/refresh endpoint? ──► reject (don't retry)
    │
    ├─ Is _retry already set? ──► reject (prevent infinite loop)
    │
    ├─ Is a refresh already in progress? ──► wait 100ms polling loop, then retry with new token
    │
    └─ Set isRefreshing = true, set _retry = true
       POST /auth/refresh (sends httpOnly cookie)
            │
       Success ──► store new token, retry original request
            │
       Failure ──► clear localStorage, redirect to /login
```

The `isRefreshing` flag prevents multiple concurrent requests from each triggering their own refresh when the access token expires.

---

## Routing Structure

`client/src/App.jsx`

```
/login                    → Login.jsx         (public, no layout)
/                         → Layout.jsx        (protected shell)
  /dashboard              → Dashboard.jsx
  /students               → Students.jsx
  /companies              → Companies.jsx
  /companies/:id          → CompanyDetail.jsx
  /sessions               → Sessions.jsx
  /attendance             → Attendance.jsx
  /results                → Results.jsx
  /reports                → Reports.jsx
  /student-dashboard      → StudentDashboard.jsx (student role only)
  *                       → redirect to /dashboard
```

**Route Guards:**
- `ProtectedRoute` — redirects to `/login` if `!isAuthenticated`
- `AdminRoute` — redirects `student` role users to `/student-dashboard`
- `StudentRoute` — redirects non-student users to `/dashboard`

All page components are **lazy-loaded** with `React.lazy()` and wrapped in `<Suspense>` — reduces initial bundle size.

**Page transitions:** Every page is wrapped in a Framer Motion `motion.div` with `opacity: 0→1` and `y: 10→0` animation (200ms). `AnimatePresence mode="wait"` handles exit animations before the next page enters.

---

## Pages — Detailed Functionality

### Login Page

- Aurora animated gradient background (`components/animated/Aurora.jsx`)
- BlurText animated page title, RotatingText subtitle cycling "Track Students / Manage Interviews / Drive Placements"
- Email + password controlled inputs
- Spinner during submission
- On success: stores `accessToken` in localStorage, redirects based on role
- On error: `toast.error(err.response?.data?.message)`

---

### Dashboard Page

**Data source:** `useDashboardStats()` hook → `GET /api/dashboard/stats` with `refetchInterval: 60_000`

**Components:**
- 4 stat cards with `AnimatedNumber` (counting animation) for Total Students, Placed, In Process, Rejected
- Recharts `BarChart` — placement by branch (Total vs Placed bars)
- Recharts `PieChart` — placement status distribution with color per slice
- Today's Sessions table — company, round, venue, time, status badge
- `FadeContent` staggered animation on cards (0.1s delay per card)
- `ScrollProgress` indicator at top

**Loading state:** ShadCN `Skeleton` components replace each section while data fetches.

**Empty states:** "No placement data" / "No sessions today" shown via `EmptyState` component if data is empty.

---

### Students Page

**Data source:** `useStudents(params)` hook → `GET /api/students?page=&limit=&search=&branch=&placementStatus=&year=`

**Features:**
- Search input with 300ms debounce (avoids API call on every keystroke)
- Filter dropdowns: Branch, Placement Status, Year
- Pagination controls (prev/next + page info)
- Status badge per student using `StatusBadge` component
- Row actions:
  - **View** — opens right-side Drawer showing personal info + interview timeline
  - **Edit** — opens modal with pre-filled form
  - **Delete** — shows `ConfirmDialog`, calls `softDeleteStudent` mutation, invalidates query cache
- Add Student button opens create modal
- All mutations use `useMutation` from React Query — cache is invalidated on success

---

### Companies Page

**Data source:** `useCompanies()` hook → `GET /api/companies`

**Features:**
- Card grid layout — each card shows name, industry, CTC, status badge, round count
- "Add Company" modal with dynamic round builder:
  - Add Round button appends a new row with auto-incremented roundNumber
  - Each row: roundName text input + roundType select
  - Remove button per round
- Click any card → navigates to `/companies/:id`

**CompanyDetail page:**
- Company name, CTC, location, website, description
- Interview Rounds table (from embedded `company.rounds`)
- Sessions table (from `GET /api/sessions?companyId=:id`)

---

### Sessions Page

**Features:**
- Sessions grouped by date using `date-fns` formatting
- Create Session modal: company select → round select (populated from company's rounds) → date/time + venue input
- Status badge per session
- "Update Status" dropdown per session calling `PATCH /api/sessions/:id/status`

---

### Attendance Page

**Features:**
- Step 1: Session dropdown (all sessions)
- Step 2 (after session selected): Loads `GET /api/sessions/:id/eligible-students`
- Shows all students with Present/Absent radio buttons
- Mark All Present / Mark All Absent convenience buttons
- Ineligible students (failed prior round) shown greyed out with reason
- Pre-fills existing attendance state if already marked
- Submit calls `POST /api/attendance/bulk`
- Toast feedback: "Attendance saved for N students"

---

### Results Page

**Features:**
- Step 1: Session dropdown
- Step 2: Loads eligible students, filters to `attendance.status === 'present'`
- Per student: outcome select (Pass / Fail / Offer / Pending) + remarks text input
- Pre-fills existing results inline
- Submit only saves changed records (skips unchanged to avoid unnecessary API calls)
- Error codes shown as specific toasts: "ATTENDANCE_GATE", "ROUND_SEQUENCE", "ELIMINATED"
- On submit: invalidates `results`, `eligible-students`, and `dashboard` query caches

---

### Reports Page

**Features:**
- Filter panel: Company select, Branch select, Placement Status select, Date From, Date To
- Apply Filters button triggers `GET /api/reports?...params`
- Results table: Student ID, Name, Branch, Company, Round, Outcome, Date
- Export CSV button calls `utils/exportCSV.js` — pure frontend, no server call
- Empty state when no results match

**CSV Export utility** (`client/src/utils/exportCSV.js`):
- Converts array of objects to CSV string
- Wraps fields containing commas/quotes in double quotes
- Creates `Blob` → `URL.createObjectURL` → programmatic anchor click → auto-download

---

### Student Dashboard

**Features (student role only):**
- My Profile card: name, email, student ID, branch, year, CGPA, placement status, sessions attended count
- Interview Timeline: per-company list of rounds with outcome badges
- Offer outcome shows special "Selected by [Company]" highlight

---

## Shared UI Components

### StatusBadge

Maps status string → Tailwind background + text color:

| Status | Color |
|---|---|
| `placed` | Green |
| `rejected` | Red |
| `in_process` | Yellow/Amber |
| `not_placed` | Gray |
| `pass` | Green |
| `fail` | Red |
| `offer` | Blue |
| `pending` | Gray |
| `present` | Green |
| `absent` | Red |
| `scheduled` | Blue |
| `completed` | Gray |
| `cancelled` | Red |

### Toast Notifications

`react-hot-toast` positioned at top-right:
- `toast.success(message)` — all successful mutations
- `toast.error(message)` — all API errors (message from `err.response.data.message`)
- `toast('info', { icon: 'ℹ️' })` — neutral info (e.g., "Nothing changed")

### ConfirmDialog

Wraps browser confirm flow in a proper modal before any delete/cancel operation. Shows action title, description, and Confirm/Cancel buttons. Only calls the mutation on explicit confirmation.

### Skeleton Loaders

Used during initial data fetch on every page. Matches the layout of the content it's loading (card-shaped skeletons for cards, row-shaped for tables).

### EmptyState

Consistent empty-data placeholder with icon, main message, and optional description line. Used on every page/section that can have empty data.

---

## Animated Components

Custom Framer Motion components in `components/animated/`:

| Component | Effect |
|---|---|
| `Aurora` | Multi-layer gradient background with slow animate |
| `BlurText` | Letters blur-in one by one |
| `RotatingText` | Cycles through an array of strings with fade transition |
| `AnimatedNumber` | Counts from 0 to target value with spring easing |
| `FadeContent` | Simple fade-in with configurable delay |
| `Ripple` | Material-design ripple effect on click |
| `TiltCard` | 3D tilt on hover using mouse position |
| `ShinyText` | Shimmer gradient over text |
| `SplitText` | Animates individual words/characters |
| `ScrollProgress` | Thin progress bar at top showing scroll position |
| `Magnet` | Magnetic hover effect pulling toward cursor |

---

## Performance Considerations

- **Code splitting:** All pages are `React.lazy()` — each page is a separate JS chunk loaded on demand
- **React Query staleTime: 30s** — data is served from cache for 30s without a background fetch
- **Dashboard refetchInterval: 60s** — auto-refresh matches server cache TTL
- **Debounced search (300ms)** — prevents API calls on every keystroke in Students page
- **Client-side CSV export** — no server round-trip for CSV generation
- **Vite dev proxy** — avoids CORS in development, no extra config needed
