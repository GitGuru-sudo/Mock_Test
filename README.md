# Campus Interview Tracker

A production-grade full-stack web application for managing campus recruitment drives. Placement officers and admins can manage students, companies, interview sessions, attendance, and results — all from a single dashboard.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Redis Caching](#redis-caching)
- [Database Seed](#database-seed)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
  - [Backend — AWS EC2](#backend--aws-ec2)
  - [Frontend — Vercel](#frontend--vercel)
- [CI/CD Pipeline](#cicd-pipeline)
- [Default Credentials](#default-credentials)

---

## Features

- **JWT Authentication** — dual-token system (access token 15 min + refresh token 7 days via httpOnly cookie)
- **Student Management** — CRUD, search, filter by branch/status, pagination, soft delete, interview timeline
- **Company Management** — dynamic round builder, recruitment status tracking
- **Session Scheduling** — create sessions per round, track status (scheduled / completed / cancelled)
- **Attendance Tracking** — bulk mark present/absent per session with eligibility enforcement
- **Result Recording** — enforce business rules: attendance gate → round sequence → elimination gate
- **Dashboard** — live stat cards, placement bar chart by branch, pie chart, today's sessions (Redis-cached, auto-refreshes every 60s)
- **Reports** — filter by company / branch / status / date range, export CSV
- **Student Portal** — students can view their own profile and interview timeline
- **Rate Limiting** — login endpoint limited to 10 requests per IP per 15 minutes

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS 3, Recharts, React Query v5, React Router v6, Framer Motion |
| Backend | Node.js 20, Express 4, Mongoose 8 |
| Database | MongoDB Atlas |
| Cache | Upstash Redis (REST API via `@upstash/redis`) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Validation | express-validator |
| Rate Limiting | express-rate-limit (in-memory) |
| Deployment — Frontend | Vercel |
| Deployment — Backend | AWS EC2 (Ubuntu) with PM2 or Docker |

---

## Project Structure

```
campus-interview-tracker/
├── client/                          # React frontend (Vite)
│   ├── src/
│   │   ├── api/                     # Axios instance + per-resource API functions
│   │   ├── components/
│   │   │   ├── animated/            # Framer Motion animated components
│   │   │   ├── layout/              # Sidebar, Navbar, Layout
│   │   │   └── ui/                  # Badge, Button, Card, Dialog, etc.
│   │   ├── context/                 # AuthContext (login, logout, user state)
│   │   ├── hooks/                   # useAuth, useStudents, useCompanies, etc.
│   │   ├── pages/                   # One file per route
│   │   └── utils/                   # formatDate, exportCSV, statusColor
│   ├── .env                         # VITE_API_URL
│   └── .env.example
│
├── server/                          # Express backend
│   ├── src/
│   │   ├── config/                  # db.js, redis.js, env.js
│   │   ├── controllers/             # Thin HTTP layer per resource
│   │   ├── middleware/              # protect, validate, errorHandler, rateLimiter
│   │   ├── models/                  # 6 Mongoose schemas
│   │   ├── routes/                  # One router per resource
│   │   ├── services/                # All business logic lives here
│   │   └── utils/                   # ApiError class
│   ├── seed.js                      # Database seed script
│   ├── Dockerfile
│   ├── .env                         # Real secrets (never commit)
│   └── .env.example                 # Template — safe to commit
│
├── docker-compose.yml               # Local Docker setup
├── .github/workflows/               # CI/CD pipelines
│   ├── backend.yml                  # Deploy backend to EC2
│   └── frontend.yml                 # Deploy frontend to Vercel
└── README.md
```

---

## Local Setup

### Prerequisites

- Node.js >= 18
- A [MongoDB Atlas](https://cloud.mongodb.com) cluster (free tier works)
- An [Upstash](https://console.upstash.com) Redis database (free tier works)

### 1. Clone

```bash
git clone https://github.com/<your-username>/campus-interview-tracker.git
cd campus-interview-tracker
```

### 2. Backend

```bash
cd server
cp .env.example .env
# Edit .env — fill in MONGODB_URI, Upstash credentials, JWT secrets
npm install
npm run dev
# Server starts on http://localhost:5000
```

### 3. Seed the database

Run this **once** after filling in `.env`:

```bash
cd server
node seed.js
```

Creates: 1 admin user, 1 officer user, 6 companies (Google, Microsoft, Amazon, Infosys, TCS, Wipro), 60 students across all branches, sessions, attendance records (80% present rate), and results following all business rules.

### 4. Frontend

```bash
cd client
npm install
npm run dev
# App starts on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

### `server/.env`

| Variable | Description | Required |
|---|---|---|
| `PORT` | Server port | No (default: 5000) |
| `MONGODB_URI` | MongoDB Atlas connection string | **Yes** |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | **Yes** |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token | **Yes** |
| `JWT_ACCESS_SECRET` | Access token secret (min 32 chars) | **Yes** |
| `JWT_REFRESH_SECRET` | Refresh token secret (min 32 chars) | **Yes** |
| `CLIENT_URL` | Frontend URL for CORS | **Yes** |
| `NODE_ENV` | `development` or `production` | No |

Generate secure JWT secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### `client/.env`

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `/api` (local) or `https://your-ec2-ip:5000/api` (production) |

> **Local dev tip:** Set `VITE_API_URL=/api` and the Vite dev proxy (`vite.config.js`) will forward all `/api` calls to `localhost:5000` — no CORS issues.

---

## Redis Caching

This app uses [Upstash Redis](https://upstash.com) via the `@upstash/redis` REST client — no persistent TCP connection required, works perfectly on serverless and EC2.

### What is cached

| Cache Key | TTL | Invalidated by |
|---|---|---|
| `dashboard:stats` | 60 seconds | Any result or attendance mutation |
| `students:list:<hash>` | 30 seconds | Any student create / update / delete |
| `company:list` | 60 seconds | Any company create / update |

### How it works

- Pattern: **cache-aside** — check Redis first, on miss query MongoDB, store result in Redis
- The dashboard auto-refetches every 60s from the frontend (React Query `refetchInterval`)
- If Redis is unavailable, all endpoints fall back to MongoDB with no downtime

### Getting Upstash credentials

1. Sign up at [https://console.upstash.com](https://console.upstash.com)
2. Create a new Redis database (choose the region closest to your EC2 instance)
3. Go to **REST API** tab
4. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` into `server/.env`

---

## Database Seed

```bash
cd server
node seed.js
```

The seed script is **idempotent** — running it twice produces the same result (clears all collections first).

**What it creates:**

| Entity | Count | Details |
|---|---|---|
| Users | 2 | 1 admin + 1 officer |
| Companies | 6 | Google, Microsoft, Amazon, Infosys, TCS, Wipro |
| Students | 60 | Across CSE/ECE/ME/CE/EE/IT branches |
| Sessions | ~23 | One per round per company |
| Attendance | ~663 | 80% present rate |
| Results | ~526 | Following all business rules |

**Default login credentials:**

| Role | Email | Password |
|---|---|---|
| Admin | `admin@placement.com` | `Admin@123` |
| Officer | `officer@placement.com` | `Officer@123` |

---

## API Documentation

All protected routes require: `Authorization: Bearer <accessToken>`

### Auth — `/api/auth`

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/register` | Create officer account | No |
| POST | `/login` | Login, returns access token + sets refresh cookie | No |
| POST | `/refresh` | Refresh access token using cookie | No |
| POST | `/logout` | Logout, clears cookie | Yes |

### Students — `/api/students`

| Method | Path | Description |
|---|---|---|
| GET | `/` | List (paginated, searchable: `?page=1&limit=20&search=&branch=CSE&placementStatus=placed`) |
| GET | `/:id` | Student detail |
| POST | `/` | Create student |
| PUT | `/:id` | Update student |
| DELETE | `/:id` | Soft delete |

### Companies — `/api/companies`

| Method | Path | Description |
|---|---|---|
| GET | `/` | List all (Redis-cached) |
| GET | `/:id` | Company detail + rounds |
| POST | `/` | Create company |
| PUT | `/:id` | Update company |
| PATCH | `/:id/status` | Update recruitment status |

### Sessions — `/api/sessions`

| Method | Path | Description |
|---|---|---|
| GET | `/` | List (`?companyId=&status=scheduled`) |
| GET | `/:id` | Session detail |
| POST | `/` | Create session |
| PATCH | `/:id/status` | Update status |
| GET | `/:id/eligible-students` | Students eligible for this session |

### Attendance — `/api/attendance`

| Method | Path | Description |
|---|---|---|
| POST | `/bulk` | Bulk mark attendance |
| GET | `/session/:sessionId` | Get all attendance for session |
| PATCH | `/:id` | Update single record |

### Results — `/api/results`

| Method | Path | Description |
|---|---|---|
| POST | `/` | Record result (enforces business rules) |
| GET | `/session/:sessionId` | Results for a session |
| GET | `/student/:studentId` | Results for a student |
| PUT | `/:id` | Update result |

### Dashboard — `/api/dashboard`

| Method | Path | Description |
|---|---|---|
| GET | `/stats` | Aggregated stats (Redis-cached 60s) |

### Reports — `/api/reports`

| Method | Path | Description |
|---|---|---|
| GET | `/` | Filtered report (`?companyId=&branch=CSE&placementStatus=placed&fromDate=&toDate=`) |

---

## Deployment

### Backend — AWS EC2

#### Option A: PM2 (Recommended)

```bash
# On your EC2 instance (Ubuntu 22.04)
sudo apt update && sudo apt install -y nodejs npm git
sudo npm install -g pm2

git clone https://github.com/<your-username>/campus-interview-tracker.git
cd campus-interview-tracker/server
npm install --omit=dev

# Create .env with production values
nano .env

# Start with PM2
pm2 start src/index.js --name campus-tracker
pm2 save
pm2 startup   # follow the printed command to enable auto-start on reboot
```

Open port 5000 in your EC2 security group (inbound TCP 5000 from 0.0.0.0/0).

#### Option B: Docker

```bash
cd campus-interview-tracker
docker-compose up -d
```

> Make sure `server/.env` is filled before running Docker Compose.

#### Nginx reverse proxy (optional but recommended)

Install Nginx and proxy port 80 → 5000 so you can use the standard HTTP port:

```nginx
server {
    listen 80;
    server_name <your-ec2-public-ip>;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Frontend — Vercel

1. Push the repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. Configure:
   - **Root Directory:** `client`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add environment variable:
   - `VITE_API_URL` = `http://<your-ec2-public-ip>:5000/api`
5. Deploy

6. **Important:** After Vercel deploys, copy your Vercel URL (e.g. `https://campus-tracker.vercel.app`) and update `CLIENT_URL` in your EC2 `server/.env`, then restart the backend — this is required for CORS to allow your frontend origin.

---

## CI/CD Pipeline

Two GitHub Actions workflows are included in `.github/workflows/`:

### `backend.yml` — Deploy backend to EC2

Triggers on push to `main` branch (changes inside `server/`).

**Required GitHub Secrets:**

| Secret | Description |
|---|---|
| `EC2_HOST` | Public IP or DNS of your EC2 instance |
| `EC2_USERNAME` | SSH username (usually `ubuntu`) |
| `EC2_SSH_KEY` | Private key content of your EC2 key pair |
| `EC2_PORT` | SSH port (usually `22`) |

### `frontend.yml` — Deploy frontend to Vercel

Triggers on push to `main` branch (changes inside `client/`).

**Required GitHub Secrets:**

| Secret | Description | Where to get |
|---|---|---|
| `VERCEL_TOKEN` | Vercel personal access token | vercel.com → Settings → Tokens |
| `VERCEL_ORG_ID` | Your Vercel org/user ID | `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | Your Vercel project ID | `.vercel/project.json` after `vercel link` |

**How to get `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`:**
```bash
cd client
npx vercel link   # follow prompts, logs into Vercel
cat .vercel/project.json
# Shows: { "orgId": "...", "projectId": "..." }
```

### Adding secrets to GitHub

Go to your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

---

## CI/CD Pipeline Details

```
Push to main
    │
    ├─── server/ changed? ──► backend.yml
    │                              │
    │                         SSH into EC2
    │                         git pull
    │                         npm install --omit=dev
    │                         pm2 reload campus-tracker
    │
    └─── client/ changed? ──► frontend.yml
                                   │
                              npm install
                              npm run build
                              vercel deploy --prod
```

No credentials are hardcoded anywhere. All secrets are injected at runtime via GitHub Actions secrets.

---

## Business Rules (enforced server-side in `resultService.js`)

1. **Attendance Gate** — Cannot record a result for a student who was absent for that session
2. **Round Sequence** — Must have `pass` in round N-1 before recording any result in round N
3. **Elimination** — Once a student gets `fail` at a company, no further results can be recorded for them at that company
4. **Offer → Placed** — Recording `offer` automatically updates `student.placementStatus = 'placed'`
5. **First Round → In Process** — Attending round 1 sets `placementStatus = 'in_process'` (if previously `not_placed`)
6. **Soft Delete** — Deleted students are hidden from all queries but data is preserved in DB

---

## License

MIT
