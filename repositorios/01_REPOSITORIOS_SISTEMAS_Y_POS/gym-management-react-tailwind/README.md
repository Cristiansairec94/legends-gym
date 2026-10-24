# 🏋️ International Body Building Club — Gym Management & E‑Commerce

A complete, production‑style full‑stack gym website + admin system.
**React (Vite) + Tailwind** frontend, **Node/Express** REST API, and a **PostgreSQL** database — every feature is wired Frontend → API → Database.

- Public website: home, about, services, plans, trainers, store, gallery, contact, booking, membership registration
- Secure admin dashboard: members, memberships, plans, payments, appointments, trainers, products, orders, services/facilities, reviews, gallery, enquiries, website content, banners
- JWT auth + bcrypt, role-based authorization, parameterized SQL, transactional business logic (stock control, membership lifecycle)

---

## 🐳 Quick Start with Docker (recommended)

No need to install Node, PostgreSQL, or psql — just Docker Desktop.

```bash
# from the project root (the folder that contains docker-compose.yml, backend/, frontend/, database/)
docker compose up --build
```

That's it. This builds and runs all three services together:

| Service   | URL                              | Notes |
|-----------|----------------------------------|-------|
| Website   | http://localhost:8080            | React app (Nginx) |
| API       | http://localhost:5000/api/health | Express |
| Database  | localhost:5432                   | Postgres 16 (postgres / postgres / gym_management) |

- The **schema and seed data load automatically** the first time the DB starts — you do **not** run `db:schema` / `db:seed`.
- The frontend talks to the backend through an Nginx proxy (`/api` → backend), so there are **no CORS issues**.
- The backend waits for Postgres to be healthy before starting.

**Common commands**

```bash
docker compose up --build -d      # run in background
docker compose logs -f backend    # tail backend logs
docker compose down               # stop (keeps data)
docker compose down -v            # stop AND wipe the DB (fresh schema+seed next up)
```

> If you edit `schema.sql` or `seed.sql`, run `docker compose down -v` then `up` again — init scripts only run on an empty database volume.

Prefer running things manually instead? The non-Docker setup is below.

---

## ✅ Requirements (manual setup)

- **Node.js** ≥ 18
- **npm** ≥ 9
- **PostgreSQL** ≥ 14

---

## 🚀 Installation & Setup

### 1. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Create the database

```bash
createdb gym_management
# or inside psql:  CREATE DATABASE gym_management;
```

### 3. Configure environment variables

**backend/.env** (copy from `.env.example`):

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gym_management
JWT_SECRET=replace_with_a_long_random_secret_string_min_32_chars
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

**frontend/.env** (copy from `.env.example`):

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 4. Load the schema and seed data

```bash
cd backend

# creates all tables, indexes, triggers
npm run db:schema     # = psql "$DATABASE_URL" -f ../database/schema.sql

# realistic demo data (admin, members, plans, products, trainers, reviews…)
npm run db:seed       # = psql "$DATABASE_URL" -f ../database/seed.sql
```

> If `$DATABASE_URL` isn't exported in your shell, run the raw command:
> `psql "postgresql://postgres:postgres@localhost:5432/gym_management" -f ../database/schema.sql`

### 5. Run the app (two terminals)

```bash
# Terminal 1 — API
cd backend
npm run dev           # http://localhost:5000  (health: /api/health)

# Terminal 2 — Website
cd frontend
npm run dev           # http://localhost:5173
```

---

## 🔑 Demo Credentials

| Role   | Email                | Password    |
|--------|----------------------|-------------|
| Admin  | `admin@ibbclub.com`  | `Admin@123` |
| Member | `ali.raza@gmail.com` | `Member@123`|

- Admin dashboard: **http://localhost:5173/admin/login**
- Member login: **http://localhost:5173/login**

> These are development-only seeded accounts. Change them before deploying.

---

## 🗂️ Project Structure

```
gym-management-system/
├── frontend/                 # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/       # Button, Modal, Loader, Pagination, StatusBadge…
│   │   │   ├── cards/        # PlanCard, TrainerCard, ProductCard, ReviewCard…
│   │   │   ├── layout/       # Navbar, Footer, PublicLayout, VantaBackground, ProtectedRoute
│   │   │   └── admin/        # AdminLayout, Sidebar, Header, DataTable, ResourceManager…
│   │   ├── pages/
│   │   │   ├── public/       # Home, About, Services, Plans, Trainers, Products, Cart…
│   │   │   ├── auth/         # Login, Signup, AdminLogin
│   │   │   └── admin/        # Dashboard, Members, Plans, Orders, Products, Reviews…
│   │   ├── context/          # AuthContext, CartContext
│   │   ├── hooks/            # useFetch, useContent
│   │   ├── services/         # axios API modules (authService, memberService…)
│   │   ├── utils/            # format, toast
│   │   ├── App.jsx           # all routes
│   │   └── main.jsx
│   └── vite.config.js
│
├── backend/                  # Node + Express + pg
│   ├── config/db.js          # pg Pool + parameterized query helper
│   ├── controllers/          # auth, member, order, product, payment… (+ generic _crud)
│   ├── middleware/           # auth (JWT+roles), validate, upload (multer), errorHandler
│   ├── routes/               # one router per resource (+ _crudRouter factory)
│   ├── utils/                # token, response envelopes, asyncHandler, codes
│   ├── uploads/              # multer image storage (served at /uploads)
│   └── server.js
│
├── database/
│   ├── schema.sql            # tables, PKs, FKs, indexes, triggers
│   └── seed.sql              # realistic demo data
│
└── README.md
```

---

## 🧩 Features

**Public site** — Hero with Vanta.js animated background (graceful fallback), membership plans, membership registration (creates member + membership + pending payment in one transaction), trainers, supplements store with cart & checkout (real stock control), appointment booking (past dates rejected), gallery, testimonials, contact form.

**Admin dashboard** — live stats from the database, full CRUD for plans, trainers, products, services, facilities, categories, gallery and banners; member management with full history (memberships/payments/appointments/orders); membership lifecycle & status refresh; payment recording; order management with automatic restock on cancel; appointment & enquiry workflows; review approval (only approved reviews show publicly); editable website content.

**Security** — bcrypt password hashing, JWT auth, role-based route guards on the **backend** (not just hidden UI), parameterized queries everywhere, express-validator input validation, CORS, safe file uploads (type + size checks, generated filenames), secrets only in `.env`.

---

## 🌐 API Overview

Base URL: `http://localhost:5000/api`. Consistent envelope: `{ success, message, data }`.

| Resource        | Endpoints (selected) |
|-----------------|----------------------|
| Auth            | `POST /auth/register`, `POST /auth/login`, `POST /auth/admin/login`, `GET /auth/me` |
| Members         | `POST /members/register` (public), `GET/POST/PUT/DELETE /members`, `POST /members/refresh-status` |
| Plans           | `GET /plans`, admin `POST/PUT/DELETE /plans/:id` |
| Memberships     | `GET/POST /memberships`, `PATCH /memberships/:id/status` |
| Payments        | `GET/POST/PUT/DELETE /payments` |
| Trainers        | `GET /trainers`, admin `POST/PUT/DELETE` |
| Services / Facilities / Categories / Gallery / Banners | full CRUD (public read, admin write) |
| Appointments    | `POST /appointments` (public), `GET /appointments`, `PATCH /:id/status` |
| Products        | `GET /products`, `GET /products/:id`, admin `POST/PUT/DELETE` |
| Orders          | `POST /orders` (checkout), `GET /orders`, `GET /orders/:id`, `PATCH /:id/status` |
| Reviews         | `GET /reviews` (approved), `POST /reviews`, `PATCH /:id/approve`, admin `PUT/DELETE` |
| Enquiries       | `POST /enquiries` (public), admin `GET`, `PATCH /:id/status`, `DELETE` |
| Content         | `GET /content` (public), `PUT /content` (admin) |
| Dashboard       | `GET /dashboard` (admin, real aggregates) |
| Upload          | `POST /upload` (admin, multipart image) |

Public read endpoints are open; all writes to admin resources require a valid **admin** JWT.

---

## 🔧 Changing Environment Variables

- **Database**: edit `DATABASE_URL` in `backend/.env`. For hosted Postgres (Neon/Render/Supabase), append `?sslmode=require` and SSL is enabled automatically.
- **JWT**: set a long random `JWT_SECRET`; adjust `JWT_EXPIRES_IN` (e.g. `1d`, `7d`).
- **CORS**: set `CORS_ORIGIN` to your frontend origin.
- **API base URL (frontend)**: edit `VITE_API_BASE_URL` in `frontend/.env` and restart Vite.

---

## ⚠️ Limitations / Notes

- **No real payment gateway.** Payments are admin‑recorded (Pending → Paid → Failed → Refunded). Membership/registration flows create a *pending* payment for an admin to confirm — there are no fake "payment successful" screens. Integrate Stripe/JazzCash/Easypaisa later if needed (would require third‑party credentials).
- Images use hosted/placeholder URLs by default; the `POST /api/upload` endpoint + `multer` support real uploads and the schema stores image URLs for trainers, products, gallery and banners.
- Google Map on the contact page is a configurable embed placeholder.
- The three.js bundle used by Vanta is large; it is lazy‑loaded and never blocks the page.

---

## What's new in this build

- **Member dashboard** (`/account`) — after login a member sees their current plan with **start/end date and days remaining**, membership & payment history, and their orders.
- **Choose a plan from the dashboard** — creates a pending membership; admin confirms the payment to activate it.
- **Member reviews** — logged-in members leave reviews (shown publicly after admin approval).
- **Member photo uploads** — members upload gym photos that appear in the public Gallery once an admin approves them.
- **Site-wide Vanta background** with the hero image set from **Admin → Content** (`hero_image`).
- **Success Stories slider**, heading divider bars, password show/hide, a **profile-icon menu**, and login-gated, per-user **persistent cart** (saved to the DB, restored on any device).

## Database seed — clean vs demo

The app now ships with a **clean database** (only the admin account + default website content). Add your real plans, products, trainers, etc. from the admin panel.

- Docker auto-loads `database/seed.sql` (clean) on first run.
- Want sample data to explore every feature quickly? Load the demo seed:
  ```bash
  # with the stack running
  docker compose exec -T db psql -U postgres -d gym_management < database/seed.demo.sql
  ```

> Because the schema changed (new `carts` table + member photo support), if you ran an older version you must re-init the volume:
> `docker compose down -v && docker compose up --build`

**Admin login:** `admin@ibbclub.com` / `Admin@123`
