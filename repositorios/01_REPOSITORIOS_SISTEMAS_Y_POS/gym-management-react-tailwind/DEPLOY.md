# Deployment Guide — IBBC Gym Management System

Architecture in the cloud (each part deploys separately — `docker-compose` is
for LOCAL only, it is NOT used in the cloud):

    Frontend (React/Vite)  ->  Vercel        (static site, free)
    Backend  (Node/Express) ->  Render        (web service, free)
    Database (PostgreSQL)   ->  Neon          (permanent free Postgres)

Vercel proxies /api and /uploads to the Render backend (see frontend/vercel.json),
so the browser talks to ONE origin — no CORS problems.

---

## 0) Push the project to GitHub

    cd gym-management-system
    git init
    git add .
    git commit -m "IBBC gym management system"
    git branch -M main
    git remote add origin https://github.com/<you>/gym-management-system.git
    git push -u origin main

Make sure `.env` files are NOT committed (they are already in .gitignore).

---

## 1) DATABASE — Neon (do this first)

1. Sign up at https://neon.tech (free, no card).
2. Create a project -> it gives you a connection string like:
   postgresql://user:pass@ep-xxxx.aws.neon.tech/neondb?sslmode=require
   Save it — this is your DATABASE_URL.
3. Load the schema + seed into Neon. Easiest: open the Neon **SQL Editor** and
   paste the contents of `database/schema.sql`, run it, then paste
   `database/seed.sql` (clean) OR `database/seed.demo.sql` (sample data), run it.
   (Or from your PC:  psql "<DATABASE_URL>" -f database/schema.sql
                      psql "<DATABASE_URL>" -f database/seed.sql )

---

## 2) BACKEND — Render

1. Sign up at https://render.com and connect your GitHub repo.
2. New +  ->  Web Service  ->  pick the repo.
3. Settings:
   - Root Directory:  backend
   - Runtime:         Node
   - Build Command:   npm install
   - Start Command:   npm start
4. Environment variables (Environment tab):
       DATABASE_URL   = <your Neon connection string from step 1>
       JWT_SECRET     = <any long random string, 32+ chars>
       JWT_EXPIRES_IN = 7d
       NODE_ENV       = production
       CORS_ORIGIN    = *
   (PORT is provided by Render automatically — the app already reads process.env.PORT.)
5. Create Web Service. Wait for the build, then note the URL, e.g.
   https://gym-backend-xxxx.onrender.com
6. Test it:  https://gym-backend-xxxx.onrender.com/api/health  -> should return JSON.

---

## 3) FRONTEND — Vercel

1. Edit `frontend/vercel.json` and replace BOTH `REPLACE-WITH-BACKEND.onrender.com`
   with your real Render host (no https:// in the host part is fine, keep the full
   https:// URL as shown). Commit + push.
2. Sign up at https://vercel.com, Import the same GitHub repo.
3. Settings:
   - Root Directory:      frontend
   - Framework Preset:    Vite
   - Build Command:       npm run build     (default)
   - Output Directory:    dist              (default)
4. Environment Variable:
       VITE_API_BASE_URL = /api
   (relative — Vercel proxies it to Render via vercel.json)
5. Deploy. You get a URL like https://gym-management.vercel.app  -> open it.

Admin login:  admin@ibbclub.com  /  Admin@123

---

## Important notes / gotchas

- COLD START: Render free web services sleep after ~15 min idle; the first
  request then takes ~50-60s to wake. Normal for free tier. Upgrade ($7/mo) for
  always-on.
- NEON never sleeps permanently but scales to zero; first query after idle has a
  small delay. Data is permanent (unlike Render's free DB which deletes at 30 days
  — that's why we use Neon).
- IMAGE UPLOADS: Render's free filesystem is EPHEMERAL — uploaded image files are
  wiped on every redeploy/restart. For production either:
    (a) just paste image URLs in the admin panel (Content/Products support URLs), or
    (b) add a Render persistent disk (paid), or
    (c) use Cloudinary/S3 for uploads.
  The database content (plans, products, trainers, reviews) is safe on Neon.
- Whenever you push to GitHub, Render + Vercel auto-redeploy.
