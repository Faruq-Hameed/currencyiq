# CurrencyIQ

A full-stack real-time currency conversion platform.

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
| `REDIS_HOST/PORT` | Redis connection |
| `JWT_SECRET` | JWT signing secret |
| `OPEN_EXCHANGE_APP_ID` | Open Exchange Rates API key |
| `EXCHANGERATE_API_KEY` | ExchangeRate-API key |
| `CURRENCYFREAKS_API_KEY` | CurrencyFreaks API key |

### Frontend (`apps/frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |

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
