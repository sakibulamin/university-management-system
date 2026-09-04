# 🎓 University Management System API

A production-style RESTful backend for managing the complete academic lifecycle of a university — departments, programs, courses, semesters, sections, enrollment, attendance, exams, results, transcripts, and bKash-based fee payments — built with Node.js, TypeScript, Express, PostgreSQL, and Prisma.

No frontend is included. Every feature is exposed as a versioned REST API, testable with Postman.

---

## Features

- **Authentication** — email/password with OTP email verification, Google login, JWT access + refresh tokens with rotation, Redis-backed OTP flow
- **3 fixed roles** — `STUDENT`, `INSTRUCTOR`, `ADMIN`, strictly enforced via role-based middleware
- **Academic structure** — Departments → Programs → Courses (with prerequisites) → Semesters → Sections
- **People management** — Instructor and Student profile management, admin user management (role change, block/unblock, soft delete)
- **Enrollment** — transaction-safe course registration with prerequisite checking, section-capacity enforcement, and re-enrollment handling
- **Attendance** — per-section attendance marking/updating with duplicate prevention
- **Exams & Results** — exam management, marks submission with automatic grade/GPA-point calculation
- **Transcript & GPA** — computed semester GPA and overall CGPA from submitted results
- **Payments** — real bKash Tokenized Checkout integration (initiate/success/fail/cancel) with duplicate-payment protection
- **Administration** — dashboard statistics (Redis-cached), audit logs for every critical action
- **Cross-cutting** — pagination, filtering, whitelisted sorting, and search on every list endpoint; consistent `{success, statusCode, message, data}` response shape; centralized error handling; rate limiting; soft deletes throughout

---

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| Language | TypeScript |
| Framework | Express 5 |
| Database | PostgreSQL |
| ORM | Prisma 7 (driver adapters) |
| Validation | Zod 4 |
| Auth | JWT (jsonwebtoken), bcryptjs, Google OAuth (google-auth-library) |
| Cache / OTP store | Redis |
| Email | Nodemailer + EJS templates |
| Payments | bKash Tokenized Checkout API |
| Security | Helmet, CORS, express-rate-limit |
| Tooling | Biome (format/lint), tsx (dev runner) |

---

## Project Structure

```
src/
├── app/
│   ├── config/            # centralized env config
│   ├── lib/                # Prisma, Redis, Google Auth, Nodemailer, bKash clients
│   ├── middleware/          # checkAuth, validateRequest, error handling, rate limiting
│   ├── modules/             # one folder per domain: auth, department, program, course,
│   │                         # semester, section, instructor, student, enrollment,
│   │                         # attendance, exam, result, transcript, payment, admin
│   │   └── <module>/
│   │       ├── <module>.interface.ts
│   │       ├── <module>.validation.ts
│   │       ├── <module>.service.ts
│   │       ├── <module>.controller.ts
│   │       └── <module>.route.ts
│   ├── routes/              # central /api/v1 route aggregator
│   ├── templates/           # EJS email templates
│   ├── interfaces/          # shared types (TAuthUser, pagination meta)
│   └── utils/               # catchAsync, sendResponse, AppError, jwt, pagination,
│                             # gradeCalculator, auditLog
├── generated/prisma/         # Prisma Client output (generated, not committed)
├── app.ts
└── server.ts

prisma/
├── schema.prisma
└── seed.ts
```

Each module follows the same simple, function-based pattern — no classes, no repository pattern, no dependency injection:

```
Route → checkAuth + Role → validateRequest (Zod) → Controller (catchAsync) → Service (AppError) → Prisma
```

---

## Installation

```bash
git clone <this-repo>
cd university-management-system
npm install
cp .env.example .env
```

Fill in `.env` (see Environment Variables below) — at minimum `DATABASE_URL` and `REDIS_URL` are required to start the server.

---

## Database Setup

```bash
npx prisma generate        # generate the Prisma Client into src/generated/prisma
npx prisma migrate dev --name init_schema   # create and apply the initial migration
```

## Seed Data

```bash
npm run seed
```

This creates (idempotently — safe to re-run):
- 1 admin user
- 2 departments (CSE, EEE), 2 programs
- 3 courses (with one prerequisite relationship)
- 1 active semester ("Spring 2026")
- 1 instructor + 1 student, each with a real profile
- 1 section (CSE101, taught by the seeded instructor)

See Admin Credentials below.

---

## Run Commands

```bash
npm run dev      # tsx watch — development, auto-restarts on file changes
npm run build    # tsc — compiles to dist/
npm run start    # node dist/src/server.js — production
```

Redis and PostgreSQL must both be reachable — `server.ts` connects to both at startup and exits if either fails.

---

## API Base URL

```
http://localhost:5000/api/v1
```

(or `${BACKEND_URL}/api/v1` in non-local environments)

All 77 endpoints across 15 modules live under this prefix. Full endpoint list: see the Postman collection at `postman/university-management-system.postman_collection.json`.

---

## Authentication

- **Register** (`POST /auth/register`) creates only `STUDENT` accounts publicly. A 6-digit OTP is emailed and the account isn't created until `POST /auth/verify-email` confirms it.
- **Login** (`POST /auth/login`) and **Google Login** (`POST /auth/google-login`) both return a short-lived `accessToken` in the response body and set a long-lived `refreshToken` as an **httpOnly cookie**.
- Protected routes require `Authorization: Bearer <accessToken>`.
- `POST /auth/refresh-token` reads the refresh-token cookie, verifies it against a hashed record in the database, and **rotates** it (old token revoked, new one issued).
- `POST /auth/logout` revokes the current refresh token server-side — meaningful logout, not just clearing a cookie.
- Forgot/reset password uses the same Redis-backed OTP pattern as registration (5-minute expiry).

---

## Role Descriptions

| Role | Can do |
|---|---|
| **STUDENT** | Manage own profile, browse the academic catalog, register/cancel course sections, view own attendance/results/transcript, initiate and track own payments |
| **INSTRUCTOR** | View own profile and assigned sections, mark/update attendance for own sections, create exams and submit/update results for own sections |
| **ADMIN** | Full management of departments/programs/courses/semesters/sections/instructors/students, user role/block/unblock/delete, dashboard statistics, audit log access |

Enforced everywhere via `checkAuth(...roles)` middleware — see `src/app/middleware/checkAuth.ts`.

---

## Payment Integration (bKash)

Real bKash Tokenized Checkout integration — **not** a fake/simulated payment flow:

1. `POST /payments/initiate` creates a `PENDING` payment row and calls bKash's Create Payment API, returning a `bkashURL` for the frontend to redirect the user to.
2. The user completes payment on bKash's hosted page; bKash redirects back to `${FRONTEND_URL}/payment/callback` with the `paymentID` and outcome.
3. The frontend calls `POST /payments/success` (or `/fail`, `/cancel`) with that `paymentID`. `/success` calls bKash's Execute Payment API and only marks the payment `PAID` if bKash confirms `transactionStatus: "Completed"` with a real `trxID`.
4. Every status transition is protected against duplicate processing via a compare-and-swap DB update (`WHERE status = PENDING`) plus a unique constraint on `bkashTrxID` — a payment can never be marked `PAID` twice.

**Known limitation:** there is no `Fee`/`FeeStructure` model, so the payment `amount` is currently supplied by the client on `/initiate` rather than derived server-side from a fee schedule. This was flagged during development as a real integrity gap to address in a future iteration.

---

## Admin Credentials (demo accounts)

After running `npm run seed`:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@university.com` | `Admin@123` |
| Instructor | `instructor@university.com` | `Instructor@123` |
| Student | `student@university.com` | `Student@123` |

---

## Environment Variables

See `.env.example` for the full list. Required to boot: `DATABASE_URL`, `REDIS_URL`. Required for specific features: `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (auth), `GOOGLE_CLIENT_ID` (Google login), `SENDER_EMAIL`/`SENDER_PASSWORD` (email/OTP), `BKASH_*` (payments).

---

## Postman Documentation

A ready-to-import collection covering all 77 endpoints, grouped by module, is included at:

```
postman/university-management-system.postman_collection.json
```

Import it into Postman, set the `baseUrl` collection variable (defaults to `http://localhost:5000/api/v1`), and log in via the Auth folder — the Login/Verify Email/Google Login requests automatically capture the returned `accessToken` into a collection variable used by every other request's Bearer auth.

---

## Deployment

_Placeholder — add your deployment URL here once deployed (e.g. Render, Railway, Fly.io, a VPS with PM2 + Nginx). Remember to set `NODE_ENV=production`, real secrets, and a production `DATABASE_URL`/`REDIS_URL` in the deployment environment, and to run `npx prisma migrate deploy` (not `migrate dev`) during deployment._

Deployment URL: `TBD`

---

## Known Design Decisions & Limitations

Documented in full detail across the phase-by-phase build log; summarized here:

- **Section** has no `status` field — only `isDeleted`. The `?status=` filter mentioned in early planning was not implemented since no such field exists.
- **Course** has no direct relation to **Program** — only to **Department**. `?programId=` filtering on courses was not implemented for the same reason.
- **"Completed course"** for transcript/GPA purposes is defined as *enrollment not cancelled AND has at least one submitted result*, not strictly `Enrollment.status === COMPLETED` — no semester-closeout mechanism exists anywhere in the API to actually set that status.
- **Exam-to-course grade aggregation** is unweighted by exam type (quiz/midterm/final all count equally, weighted only by marks) — no weighting scheme was ever specified.
- **Payment amount** is client-supplied (no `Fee` model exists to derive it server-side).

None of these block core functionality; all were flagged in place, in the relevant phase, at the time they were decided.
