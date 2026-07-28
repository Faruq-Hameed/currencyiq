# CurrencyIQ — Backend API

NestJS backend for the CurrencyIQ real-time currency conversion platform. Aggregates live and historical exchange rates from **5 external providers** with automatic failover and quota management, exposes a public REST API with API-key authentication and Redis-backed rate limiting, and serves rich currency metadata sourced from RestCountries.

**Live:** https://currencyiq-backend.vercel.app/api/v1 — deployed on Vercel (see the
[root README](../../README.md#deploying-to-vercel) for the full deployment writeup).

---

## Features

- **Live Rate Conversion** — Convert between any two currencies; convert one amount to up to 20 currencies in a single request
- **Historical Rates** — Query 7-day, 30-day, 90-day, or 1-year rate history for any currency pair
- **5-Provider Aggregation** — Pulls from Frankfurter, ExchangeRate-API, Open Exchange Rates, CurrencyFreaks, and Fawaz Ahmed's API; falls back automatically when a provider hits its quota or fails health checks
- **Scheduled Sync** — Hourly rate sync for 25 major currencies (including NGN, GHS, KES), monthly quota resets, weekly metadata refresh, provider health checks every 10 minutes
- **Currency Metadata** — Rich per-currency data: flag, symbol, subunit, central bank name and URL, countries using the currency, exchange regime, and denominations (banknotes)
- **API Keys** — JWT-authenticated dashboard lets users create, list, and revoke API keys (plain key shown once on creation)
- **Redis Rate Limiting** — Custom `RedisThrottleGuard` — configurable per-endpoint request limits (e.g. 500 req/hour for conversion, 5/day for force-refresh)
- **Usage Tracking** — Per-user request counts (today / this month) and per-provider status dashboard
- **Swagger Docs** — Auto-generated at `/api/docs` in non-production environments
- **Docker** — Dockerfile included; orchestrated with docker-compose alongside PostgreSQL and Redis

---

## Tech Stack

| Layer            | Technology                                    |
|------------------|-----------------------------------------------|
| Framework        | NestJS + TypeScript                           |
| Database         | PostgreSQL via TypeORM                        |
| Cache / Throttle | Redis (ioredis)                               |
| Auth             | JWT (Bearer) + API-key header (`x-api-key`)   |
| Scheduler        | `@nestjs/schedule` cron jobs                  |
| Docs             | Swagger / OpenAPI                             |
| Container        | Docker + docker-compose                       |

---

## Project Structure

```
src/
├── config/
│   ├── configuration.ts        # Env-based config (port, DB, Redis, JWT, providers)
│   └── data-source.ts          # TypeORM data source for migrations
├── common/
│   ├── decorators/             # @CurrentUser(), @ApiKey()
│   ├── filters/                # Global HTTP exception filter
│   └── interceptors/           # TransformInterceptor (standardised response shape)
└── modules/
    ├── auth/                   # Register, login, JWT strategy, guards
    ├── api-keys/               # CRUD for developer API keys + usage stats
    ├── currencies/             # Currency list, detail, metadata (entity + controller)
    ├── rates/
    │   ├── providers/          # Frankfurter, ExchangeRate-API, OpenExchange, CurrencyFreaks, Fawaz-Ahmed
    │   ├── rates.controller.ts # GET /rates, /rates/convert, /rates/convert/multi, /rates/history
    │   ├── rates.service.ts    # Aggregation, failover, caching
    │   ├── rates.scheduler.ts  # Hourly sync, health checks, quota reset, cleanup
    │   ├── provider-manager.service.ts  # Provider selection, quota tracking, health
    │   └── usage.controller.ts # /usage/me, /usage/providers
    ├── users/                  # User entity
    ├── redis/                  # Redis module (ioredis wrapper)
    └── throttle/               # RedisThrottleGuard + @RateLimit() decorator
```

---

## API Endpoints

### Auth
| Method | Endpoint              | Description          |
|--------|-----------------------|----------------------|
| POST   | `/api/v1/auth/register` | Create account      |
| POST   | `/api/v1/auth/login`    | Login, get JWT      |

### Rates (API-key or IP throttled)
| Method | Endpoint                    | Limit        | Description                         |
|--------|-----------------------------|--------------|-------------------------------------|
| GET    | `/api/v1/rates?base=USD`    | 500/hr       | All rates for a base currency       |
| GET    | `/api/v1/rates/convert`     | 500/hr       | Convert amount between two pairs    |
| GET    | `/api/v1/rates/convert/multi` | 200/hr     | Convert to up to 20 currencies      |
| GET    | `/api/v1/rates/history`     | 200/hr       | Historical rates (7d/30d/90d/1y)    |
| POST   | `/api/v1/rates/refresh`     | 5/day        | Force-refresh a specific pair       |

### Currencies
| Method | Endpoint                    | Description                         |
|--------|-----------------------------|-------------------------------------|
| GET    | `/api/v1/currencies`        | List all currencies (searchable)    |
| GET    | `/api/v1/currencies/:code`  | Full metadata for one currency      |

### API Keys (JWT required)
| Method | Endpoint              | Description                        |
|--------|-----------------------|------------------------------------|
| GET    | `/api/v1/keys`        | List user's API keys               |
| POST   | `/api/v1/keys`        | Create key (plain shown once)      |
| DELETE | `/api/v1/keys/:id`    | Revoke key                         |
| GET    | `/api/v1/keys/:id/usage` | Usage stats for a key           |

### Usage (JWT required)
| Method | Endpoint               | Description                        |
|--------|------------------------|------------------------------------|
| GET    | `/api/v1/usage/me`     | My request counts (today / month)  |
| GET    | `/api/v1/usage/providers` | Provider status and quota info  |

---

## Getting Started

```bash
# Install dependencies
npm install

# Copy env and fill in values
cp .env.example .env

# Run in development
npm run start:dev

# Or with Docker
docker-compose up --build
```

### Required Environment Variables

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/currencyiq
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret
FRONTEND_URL=http://localhost:3000

# Provider API keys (at least one required)
OPEN_EXCHANGE_APP_ID=
CURRENCY_FREAKS_API_KEY=
EXCHANGE_RATE_API_KEY=
```

Swagger docs available at `http://localhost:3001/api/docs` when `NODE_ENV` is not `production`.
