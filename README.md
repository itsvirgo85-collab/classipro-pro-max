# ClassiPro PRO MAX — Full-Stack Classified Marketplace

## Fixes applied in this package
1. **Critical:** `express.json()` was missing — register/login/JSON APIs could not parse body.
2. **Users routes:** `/me` and `/me/messages` placed before `/:id` so they are not treated as user IDs.
3. **CORS:** relaxed for multi-origin frontend during setup (`origin: true`).
4. **Dockerfile:** works without `package-lock.json` (`npm install` fallback).
5. **Static client:** demo listings when API is offline (Netlify-friendly).
6. **Error handler:** Zod validation returns 400 with clear messages.
7. **Optional:** server can also serve `client/` as static files.

## Architecture note (Netlify / Vercel)
This is a **Node + PostgreSQL + Socket.IO + Stripe** app.
- **Netlify / Vercel** can host the **frontend** (`client/`) as static site.
- Full API needs a **Node host** (Railway, Render, Fly.io, VPS) + **managed Postgres**.
- Netlify alone cannot run persistent Express + Socket.IO + local disk uploads.

## Local run
```bash
# 1) Postgres
docker compose up -d db

# 2) API
cd server
cp .env.example .env   # set DATABASE_URL, JWT_SECRET
npm install
npx prisma db push
npm run seed
npm run dev

# 3) Open client/index.html via any static server, or let API serve client/
```

## Environment (`server/.env`)
See `.env.example`. Never put secrets in frontend JS.
