# CurrencyIQ

A full-stack real-time currency conversion platform.

## Live Deployment

- **Frontend:** https://currencyiq-frontend.vercel.app
- **Backend API:** https://currencyiq-backend.vercel.app/api/v1
- **Swagger docs:** disabled in production (non-prod only, see below)

Both auto-deploy from `main` via Vercel's GitHub integration; see
[Deploying to Vercel](#deploying-to-vercel) for how it's configured.

## Stack
- **Backend:** NestJS + TypeORM + PostgreSQL + Redis
- **Frontend:** Next.js 16 + Tailwind CSS + Recharts + Zustand
- **Infra:** Docker Compose

## Quick Start (Docker)

```bash
docker compose up -d
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/v1
- Swagger docs: http://localhost:3001/api/docs

## Local Development

### Backend

```bash
cd apps/backend
cp .env.example .env   # fill in API keys
npm install
npm run start:dev
```

### Frontend

```bash
cd apps/frontend
npm install
npm run dev
```

## Environment Variables

### Backend (`apps/backend/.env`)

| Variable | Description |
|---|---|
| `DB_HOST/PORT/NAME/USER/PASS` | PostgreSQL connection |
| `DB_SSL` | `true` for hosted Postgres requiring SSL (Neon/Supabase/RDS) |
| `REDIS_HOST/PORT/PASSWORD` | Redis connection (local/Docker dev, via `ioredis`) |
| `REDIS_TLS` | `true` if that Redis requires TLS |
| `REDIS_URL` | Single `ioredis`-style connection string; overrides `REDIS_HOST/PORT/PASSWORD/TLS` when set |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash's REST API credentials — used instead of the vars above whenever both are set (production/Vercel). No persistent TCP connection, which is what Upstash recommends for serverless. |
| `JWT_SECRET` | JWT signing secret |
| `OPEN_EXCHANGE_APP_ID` | Open Exchange Rates API key |
| `EXCHANGERATE_API_KEY` | ExchangeRate-API key |
| `CURRENCYFREAKS_API_KEY` | CurrencyFreaks API key |
| `RESTCOUNTRIES_API_KEY` | RestCountries API key (used once, at first boot, to seed currency names/symbols/flags — see below) |
| `CRON_SECRET` | Vercel-only: shared secret for triggering `/internal/cron/*` endpoints (see [Deploying to Vercel](#deploying-to-vercel)) |

### Frontend (`apps/frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |

## Deploying to Vercel

This is a monorepo, so it deploys as **two separate Vercel projects** pointing at the
same GitHub repo, each with a different Root Directory:

| Project | Root Directory | What it is |
|---|---|---|
| `currencyiq-frontend` | `apps/frontend` | Next.js app — Vercel's native use case, zero config needed |
| `currencyiq-backend` | `apps/backend` | NestJS API, adapted to run as a Vercel serverless function |

### Why the backend needed code changes

Vercel functions are stateless and don't stay alive between requests. The backend
originally relied on two things that assume a long-running process:

1. **In-process cron** (`@nestjs/schedule`, hourly rate sync, quota resets, health
   checks) — now also exposed as HTTP endpoints under `/api/v1/internal/cron/*`,
   guarded by a `CRON_SECRET` header. The original `@Cron` jobs still run as before on
   any non-Vercel host (Docker, Railway, etc.) — only Vercel deploys switch to the HTTP
   trigger path.
2. **A persistent Redis connection** — `RedisService` uses Upstash's REST client
   (`@upstash/redis`) instead of `ioredis` whenever `UPSTASH_REDIS_REST_URL`/
   `UPSTASH_REDIS_REST_TOKEN` are set, so there's no TCP connection to keep alive
   between invocations. Local/Docker dev still uses `ioredis` against a real Redis
   container.

**Triggering the cron endpoints for free:** Vercel Cron Jobs would be the obvious way
to call `/api/v1/internal/cron/*` on a schedule, but the **Hobby plan** caps them at 2
jobs running at most once a day — this app needs 5, some as often as every 10 minutes,
which needs Vercel Pro. To stay fully free, this repo instead uses **GitHub Actions
scheduled workflows** (`.github/workflows/cron-*.yml`, one per job) to call those same
endpoints — free with unlimited minutes since this repo is public. Each workflow needs
two repo secrets (**Settings → Secrets and variables → Actions**):

| Secret | Value |
|---|---|
| `BACKEND_URL` | Your deployed backend's Vercel URL, no trailing slash (e.g. `https://currencyiq-backend.vercel.app`) |
| `CRON_SECRET` | The same value you set as the backend's `CRON_SECRET` env var |

You can trigger any of them manually from the repo's **Actions** tab (each workflow has
`workflow_dispatch` enabled) to confirm the secrets are wired up correctly before
waiting for the schedule.

Also: `synchronize: true` is still enabled on the TypeORM config (no migrations exist
yet in this repo) — fine for getting a first deploy running, but worth replacing with
real migrations before this holds real user data, since concurrent cold starts and
schema changes don't mix well.

### Credentials checklist — what to grab, and where

| Variable | Where to get it | Used by |
|---|---|---|
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASS` | Create a free Postgres on [neon.com](https://neon.com) (or Supabase) → copy the connection string it gives you and split it into these parts. Use the **pooled** connection host if offered (Neon's has `-pooler` in the hostname) — serverless functions open many short-lived connections. | Backend DB |
| `DB_SSL` | Set to `true` — Neon/Supabase require SSL. | Backend DB |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Create a free Redis database at [upstash.com](https://upstash.com) (GitHub OAuth works, no card needed) → its dashboard page shows both values directly under "REST API". Note: Vercel's own Upstash *Marketplace* integration only offers paid plans — sign up at upstash.com directly instead to get the real free tier. | Backend caching/rate-limiting |
| `JWT_SECRET` | Generate one yourself, don't reuse the dev default: `openssl rand -hex 32` | Backend auth |
| `OPEN_EXCHANGE_APP_ID` | Free account at [openexchangerates.org](https://openexchangerates.org) → App IDs page | Rates provider #1 |
| `EXCHANGERATE_API_KEY` | Free account at [exchangerate-api.com](https://www.exchangerate-api.com) → Dashboard | Rates provider #3 |
| `CURRENCYFREAKS_API_KEY` | Free account at [currencyfreaks.com](https://currencyfreaks.com) → Dashboard | Rates provider #4 |
| `RESTCOUNTRIES_API_KEY` | Sign up at [restcountries.com/sign-up](https://restcountries.com/sign-up) → copy the key from your account dashboard. Only used once per deploy, at first boot with an empty database, to populate currency names/symbols/flags/country lists (the old free, keyless `v3.1` API this used to hit was deprecated — `v5` requires this key). Without it, the currencies table stays empty and `/api/v1/currencies` returns nothing. | Backend currency seeding |
| `CRON_SECRET` | Generate one yourself: `openssl rand -hex 32`. Set the **same value** as a Vercel env var — Vercel automatically sends it as `Authorization: Bearer <value>` when triggering your cron paths. | Backend cron auth |
| `FRONTEND_URL` | The deployed frontend's Vercel URL (for CORS) | Backend |
| `NEXT_PUBLIC_API_URL` | The deployed backend's Vercel URL + `/api/v1` | Frontend |
| `NEXT_PUBLIC_APP_URL` | The deployed frontend's own Vercel URL | Frontend |
| `SMTP_*` (optional) | Any SMTP provider (Resend, SES, Mailgun...) — only needed if/when email sending is wired up | Backend, optional |

Open Exchange Rates, ExchangeRate-API and CurrencyFreaks all have working free tiers;
Frankfurter and Fawaz Ahmed (the other two providers in the failover chain) need no key
at all.

### Deploy steps

1. Push this repo to GitHub if it isn't already there.
2. In Vercel: **New Project** → import the repo → set **Root Directory** to
   `apps/backend` → Deploy (env vars can be added after, see below).
3. In Vercel: **New Project** again → same repo → **Root Directory** `apps/frontend` →
   set `NEXT_PUBLIC_API_URL` to the backend project's URL + `/api/v1`, and
   `NEXT_PUBLIC_APP_URL` to this frontend project's own URL → Deploy.
4. Provision Postgres: from the **backend** project's dashboard → Storage tab →
   **Marketplace** → add **Neon** (free plan by default). This auto-injects Neon's own
   env var names (`PGHOST`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, ...) — add this app's
   expected `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASS`/`DB_SSL=true` vars using
   those same values (use the pooled `PGHOST`, the one with `-pooler` in it).
5. Provision Redis: sign up directly at [upstash.com](https://upstash.com) (not through
   Vercel's Marketplace — see the credentials table below for why) → create a database →
   copy `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` into the backend project's
   env vars.
6. Add the remaining backend env vars from the table below (`JWT_SECRET`, `CRON_SECRET`,
   `RESTCOUNTRIES_API_KEY`, `FRONTEND_URL`, etc.), then redeploy the backend.
7. Set the two GitHub Actions repo secrets (`BACKEND_URL`, `CRON_SECRET`) — see above —
   so the cron workflows can reach the deployed backend.
8. Hit `https://<backend-url>/api/v1/currencies` once — `synchronize: true` creates the
   tables on first boot and `seedIfEmpty()` seeds currency data automatically.

**Root Directory must be set for git-push auto-deploy to work** — if a project was
linked via the Vercel CLI instead of the steps above, Root Directory isn't set
automatically and there's no CLI command for it; set it in each project's
**Settings → General → Root Directory**.

## API Highlights

| Endpoint | Description |
|---|---|
| `GET /api/v1/rates/convert?from=USD&to=NGN&amount=100` | Convert currency |
| `GET /api/v1/rates/convert/multi?from=USD&to=NGN,GBP,EUR` | Multi-currency convert |
| `GET /api/v1/rates/history?from=USD&to=NGN&period=7d` | Historical rates |
| `POST /api/v1/rates/refresh` | Force-refresh a pair |
| `GET /api/v1/currencies` | List all currencies |
| `GET /api/v1/currencies/NGN` | Currency details |

## Data Providers (with automatic failover)

1. Open Exchange Rates (USD pairs)
2. Frankfurter (ECB, free)
3. ExchangeRate-API
4. CurrencyFreaks
5. Fawaz Ahmed (unlimited, last resort)

## Rate Limits

| Action | API Key | IP |
|---|---|---|
| Convert | 500/hr | 30/hr |
| Multi-convert | 200/hr | 10/hr |
| Force refresh | 5/day | 1/day |
| History | 200/hr | 10/hr |
