# RMS Deployment Guide

This document describes how to run and deploy the RMS services locally and to
production hosting. Nothing in this guide was written as a claim that these exact steps
were executed on a real cloud account; where a step could not be verified locally it is
explicitly marked **not tested locally**.

## Architecture

| Service            | Directory                  | Stack                     | Local port |
| ------------------ | -------------------------- | ------------------------- | ---------- |
| Frontend (web UI)  | `restaurant-frontend`      | Next.js 16 + React 19     | `3000`     |
| Backend (REST API) | `restaurant-backend`       | Laravel 12 + PHP 8.2      | `8000`     |

The frontend calls the backend at `http://localhost:8000/api/v1` (overridable via
`NEXT_PUBLIC_API_URL`). Forecasting is handled internally within the Laravel backend.

## Prerequisites

- PHP 8.2+ and Composer (backend)
- Node.js 20.9+ / 22 (frontend)

## Local development

### 1. Backend (`restaurant-backend`)

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --port=8000
```

Seed credentials are controlled by `ADMIN_PASSWORD` and `DEMO_USER_PASSWORD` in `.env`
(empty → random passwords printed once at seed time).

### 2. Frontend (`restaurant-frontend`)

```bash
npm install
cp .env.local.example .env.local   # if present; else create .env.local
npm run dev
```

The frontend uses `NEXT_PUBLIC_API_URL` for the API base URL, defaulting to
`http://localhost:8000/api/v1`.

## Environment variables

### Frontend (Vercel / local `.env.local`)

| Variable               | Required | Description                                            |
| ---------------------- | -------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_API_URL`  | Yes      | Public URL of the deployed backend, e.g. `https://api.your-domain.com/api/v1`. |

### Backend (`.env`, see `.env.example` for all options)

| Variable                            | Required | Description                                                     |
| ----------------------------------- | -------- | --------------------------------------------------------------- |
| `APP_KEY`                           | Yes      | `php artisan key:generate`.                                     |
| `APP_ENV`                           | Yes      | `production` in production.                                     |
| `APP_URL`                           | Yes      | Public URL of the backend.                                      |
| `ADMIN_PASSWORD` / `DEMO_USER_PASSWORD` | No   | Fixed seed credentials (empty → random).                        |
| `CORS_ALLOWED_ORIGINS`              | Yes      | Comma-separated exact frontend origins (e.g. `https://app.your-domain.com`). |
| `CORS_ALLOWED_ORIGINS_PATTERNS`     | No       | Comma-separated PCRE patterns for dynamic origins (Vercel preview domains). |
| `CORS_SUPPORTS_CREDENTIALS`         | Yes      | `true`. Never use `*` origins with credentials enabled.         |
| `CORS_MAX_AGE`                      | No       | Preflight cache seconds.                                        |
| `LOGIN_MAX_ATTEMPTS` / `LOGIN_DECAY_MINUTES` | No | Login rate limiting.                                       |
| `DB_CONNECTION` + `DB_*`            | Yes      | Database settings (see "Database in production").               |
| `SESSION_DRIVER`, `QUEUE_CONNECTION`| No       | Defaults to `database`; see note below.                         |

## CORS

CORS is configured entirely from env vars on the backend — there are no hardcoded
origins. For the frontend deployed at `https://app.example.com`, set:

```
CORS_ALLOWED_ORIGINS=https://app.example.com
CORS_SUPPORTS_CREDENTIALS=true
```

For ephemeral Vercel preview domains, add a pattern:

```
CORS_ALLOWED_ORIGINS_PATTERNS=~^https://.*\.vercel\.app$
```

## Deployment

### Frontend → Vercel

1. Push `restaurant-frontend` to a GitHub repo and import it in Vercel.
2. Set `NEXT_PUBLIC_API_URL` to the deployed backend URL (must be a build-time env var).
3. Build command `npm run build`, output directory defaults to `next build`.

### Backend → Render

1. Push `restaurant-backend` to a GitHub repo and create a **Web Service**.
2. Environment: `APP_ENV=production`, `APP_KEY=<generated>`, `APP_URL=<render url>`,
   `CORS_ALLOWED_ORIGINS=<frontend url>`.
3. Build: Render Nixpacks auto-detects Laravel (`composer install`).
4. Start command (Render sets `$PORT`):

    ```bash
    php artisan migrate --force --no-interaction && php artisan serve --host 0.0.0.0 --port $PORT
    ```

5. **Queue note:** the app defaults to a database queue. In production either run a
   separate worker (`php artisan queue:work`) or set `QUEUE_CONNECTION=sync` for a
   single-instance deploy. `SESSION_DRIVER=database` requires migrations to have run.

## Database in production

- Local/testing uses **SQLite** (`DB_CONNECTION=sqlite`). Tests run against
  `:memory:`, so they need no database server.
- For production, use a managed database (e.g. Render Postgres / Neon) and set:

  ```
  DB_CONNECTION=pgsql
  DB_HOST=<host>
  DB_PORT=5432
  DB_DATABASE=<dbname>
  DB_USERNAME=<user>
  DB_PASSWORD=<password>
  ```

  Note: the schema has been exercised against SQLite; the production Postgres run
  should be smoke-tested before go-live.

## CI/CD

GitHub Actions workflows are committed in each repo under `.github/workflows/ci.yml`:

- `restaurant-backend` — PHP 8.2/8.3 matrix, `composer install`, `composer test`.
- `restaurant-frontend` — `npm ci`, ESLint, Vitest (`--pool=threads`), TypeScript with
  an error budget of 31 pre-existing baseline errors.

## Health checks & smoke test

Backend:

```
GET /health          → 200 { "status": "ok", "timestamp": "...", "app": "Laravel", "version": "1.0.0" }
GET /up              → 200 { "status": "ok" }   (Render health check path)
```

End-to-end smoke test after deployment:

1. Open the frontend URL and log in with a seeded admin account.
2. Confirm the dashboard, POS, and Kitchen screens load (they call the backend API).
3. Open the Demand Forecast page — the frontend asks the backend, which uses internal
   Laravel forecasting. If forecasts render, the full stack is wired correctly.
4. Verify a `GET /health` on the backend URL returns 200.