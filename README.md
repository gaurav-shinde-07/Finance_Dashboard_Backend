# Finance Dashboard Backend API

A production-grade, role-based financial data management REST API built with Node.js, Express, and Supabase.

## Live Demo
- **API Base URL:** 'prod ke baad update krdunga'
- **Swagger Docs:** `https://your-app.vercel.app/api-docs`

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js 18+ | LTS, fast, great ecosystem |
| Framework | Express.js | Minimal, flexible, battle-tested |
| Database | PostgreSQL (Supabase) | Relational integrity, RLS, real-time capable |
| Auth | Supabase Auth | JWT-based, production-proven, no custom auth server needed |
| Docs | Swagger/OpenAPI 3.0 | Interactive, self-documenting |
| Deploy | Vercel | Zero-config, serverless, free tier |

---

## Quick Start

### 1. Clone and install
```bash
git clone <your-repo-url>
cd finance-dashboard-backend
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
```
Fill in your Supabase credentials from **Supabase Dashboard → Settings → API**.

### 3. Set up the database
- Go to your **Supabase Dashboard → SQL Editor**
- Open `supabase/schema.sql`
- Paste and run the entire file

### 4. Run locally
```bash
npm run dev
```
Visit `http://localhost:3000/api-docs` for interactive documentation.

---

## API Overview

### Authentication
All protected routes require:
```
Authorization: Bearer <access_token>
```
Get your token from `POST /api/auth/login`.

### Role Permissions

| Endpoint | Viewer | Analyst | Admin |
|---|---|---|---|
| View own records | ✅ | ✅ | ✅ |
| View all records | ❌ | ❌ | ✅ |
| Create records | ❌ | ✅ | ✅ |
| Update records | ❌ | ✅ | ✅ |
| Delete records | ❌ | ❌ | ✅ |
| Dashboard summary | ✅ | ✅ | ✅ |
| Category breakdown | ❌ | ✅ | ✅ |
| Monthly/weekly trends | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |

### Endpoints

#### Auth (`/api/auth`)
| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/register` | Register new user | No |
| POST | `/login` | Login, get token | No |
| POST | `/logout` | Invalidate session | Yes |
| GET | `/profile` | Get own profile | Yes |
| PATCH | `/profile` | Update own name | Yes |

#### Users (`/api/users`) — Admin only
| Method | Path | Description |
|---|---|---|
| GET | `/` | List all users (paginated, searchable) |
| GET | `/:id` | Get user by ID |
| PATCH | `/:id/role` | Change user role |
| PATCH | `/:id/status` | Activate/deactivate user |
| DELETE | `/:id` | Permanently delete user |

#### Records (`/api/records`)
| Method | Path | Auth Level |
|---|---|---|
| GET | `/` | Any role |
| POST | `/` | Analyst + Admin |
| GET | `/:id` | Any role |
| PATCH | `/:id` | Analyst + Admin |
| DELETE | `/:id` | Admin only |
| PATCH | `/:id/restore` | Admin only |

**Query filters for GET /records:**
- `type` — `income` or `expense`
- `category` — e.g. `Salary`, `Rent`
- `start_date`, `end_date` — `YYYY-MM-DD`
- `search` — searches description and category
- `sort_by` — `record_date`, `amount`, `created_at`, `category`
- `sort_order` — `asc` or `desc`
- `page`, `limit` — pagination

#### Dashboard (`/api/dashboard`)
| Method | Path | Auth Level | Description |
|---|---|---|---|
| GET | `/summary` | Any role | Total income, expenses, net balance |
| GET | `/categories` | Analyst + Admin | Breakdown by category |
| GET | `/trends/monthly` | Analyst + Admin | Monthly income vs expense |
| GET | `/trends/weekly` | Analyst + Admin | Weekly income vs expense |
| GET | `/activity` | Any role | Recent transactions feed |

---

## Technical Decisions & Tradeoffs

### Why Supabase Auth over custom JWT?
Rolling custom JWT means: secret management, token refresh logic, blacklisting on logout, refresh token rotation. Supabase handles all of this battle-tested and free. The tradeoff is vendor dependency — if Supabase is down, auth is down. But that tradeoff is worth it at this scale.

### Why Soft Delete for financial records?
Financial data is regulated data. Even in a demo system, hard-deleting a transaction is bad practice. An "oops I deleted the wrong record" scenario is genuinely dangerous in finance. Soft delete (a `deleted_at` timestamp) preserves the audit trail while keeping the record invisible in normal queries. Admin can restore it.

### Why not use Supabase RLS for everything?
RLS is great but has limits. Complex cross-user admin queries, role-based filtering, and aggregations are cleaner in Express service logic with the service role client. We use RLS as a safety net (defense in depth) and business logic in the service layer as the primary enforcement.

### Why a Service Layer?
Routes → Controllers → Services → Database. The service layer means: 
- Business logic is testable without HTTP
- If we ever swap Express for Fastify or GraphQL, services don't change
- Controllers stay thin and readable — they only parse requests and send responses

### Why push aggregation to the DB rather than JS?
For the dashboard, fetching 10,000 records into Node and summing them in JS is wasteful. PostgreSQL aggregates on the DB side, network transfers only the result. We do a hybrid — simple cases (small datasets after user scoping) aggregate in JS, complex cases push to Postgres.

### Pagination cap at 100 per page
Prevents someone from requesting 10,000 records in one API call. Standard practice — protects both database and network.

---

## Deployment on Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables on Vercel
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NODE_ENV  # set to "production"
```

After deploy, update the server URL in `src/config/swagger.js` with your actual Vercel URL.

---

## Project Structure
```
finance-dashboard-backend/
├── api/index.js              # Entry point (Vercel + local)
├── src/
│   ├── config/               # Supabase client, Swagger config
│   ├── middleware/           # Auth, RBAC, rate limiter, error handler
│   ├── modules/              # Feature modules (auth, users, records, dashboard)
│   │   └── [module]/
│   │       ├── *.routes.js   # Express routes + Swagger JSDoc
│   │       ├── *.controller.js  # Request/response handling
│   │       └── *.service.js    # Business logic + DB queries
│   └── utils/                # Shared helpers (response, validators)
├── supabase/schema.sql       # Complete DB schema with RLS
└── vercel.json               # Vercel deployment config
```

---

## Valid Categories
`Salary`, `Freelance`, `Investment`, `Rent`, `Utilities`, `Groceries`, `Healthcare`, `Entertainment`, `Marketing`, `Operations`, `Travel`, `Education`, `Other`

## Assumptions Made
1. All users start with `viewer` role — admins promote them
2. Analysts can create and update records (not just read) — this is a reasonable assumption for a financial team analyst
3. Amount is always stored as a positive number; the `type` field (income/expense) determines direction
4. Email confirmation via Supabase is optional — disable it in Supabase Dashboard → Auth → Settings for easier testing
5. The service role key bypasses RLS intentionally — this is standard Supabase backend practice