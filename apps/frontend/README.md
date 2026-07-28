# CurrencyIQ — Frontend

Next.js web application for the CurrencyIQ currency conversion platform. Provides a live currency converter, historical rate charts, rich per-currency metadata pages, and a developer dashboard for managing API keys and monitoring usage.

**Live:** https://currencyiq-frontend.vercel.app — deployed on Vercel (see the
[root README](../../README.md#deploying-to-vercel) for the full deployment writeup).

---

## Features

- **Live Converter** — Enter an amount, pick source and target currencies, get an instant converted result with the source provider attribution and last-updated timestamp
- **Multi-currency Convert** — Convert one amount to multiple currencies simultaneously
- **Historical Charts** — 7-day, 30-day, 90-day, and 1-year rate charts for any currency pair
- **Currency Directory** — Searchable list of all supported currencies with flag, name, symbol, and countries
- **Currency Detail Pages** — Full metadata per currency: flag, symbol, subunit, denominations, central bank name and URL, countries, and exchange regime
- **Developer Dashboard** — Create and revoke API keys, view per-key usage stats (requests today / this month), and monitor provider health status
- **Auth** — Register and login; JWT stored for authenticated dashboard routes

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Framework   | Next.js (App Router) + TypeScript   |
| Styling     | Tailwind CSS                        |
| HTTP Client | Fetch (native)                      |
| Fonts       | Geist Sans / Geist Mono             |

---

## Project Structure

```
apps/frontend/
├── app/
│   ├── layout.tsx              # Root layout, font setup
│   ├── page.tsx                # Home — converter UI
│   ├── globals.css
│   └── ...                     # Route pages (currencies, dashboard, auth, etc.)
└── public/
    └── ...                     # Static assets
```

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Set the backend URL in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

The frontend expects the [CurrencyIQ backend](../backend/README.md) to be running.

---

## Pages Overview

| Route                    | Description                                              |
|--------------------------|----------------------------------------------------------|
| `/`                      | Live currency converter                                  |
| `/currencies`            | Searchable currency directory                            |
| `/currencies/[code]`     | Full metadata for a single currency                      |
| `/history`               | Historical rate chart for a pair                         |
| `/dashboard`             | Developer dashboard — API keys and usage                 |
| `/login`                 | Login                                                    |
| `/register`              | Register new account                                     |
