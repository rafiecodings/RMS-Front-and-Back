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

The frontend calls the backend through the same-origin proxy at `/api/v1`
(`NEXT_PUBLIC_API_URL` left unset, defaulting to `/api/v1` in
`src/lib/utils/constants.ts`), which `restaurant-frontend/next.config.ts`
rewrites to `NEXT_PUBLIC_BACKEND_URL` (`/api/v1` and `/storage` rewrites).
Forecasting is handled internally within the Laravel backend.

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

The frontend uses `NEXT_PUBLIC_BACKEND_URL` for the `/api/v1` and `/storage`
rewrites in `next.config.ts` (defaults to `http://127.0.0.1:8000` locally).
`NEXT_PUBLIC_API_URL` defaults to `/api/v1` (same-origin proxy) in
`src/lib/utils/constants.ts` — leave it unset so the `auth_token`
(`SameSite=Lax`) cookie is sent.

## Environment variables

### Frontend (Vercel / local `.env.local`)

| Variable                  | Required              | Description                                                                                                     |
| ------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_BACKEND_URL` | Yes (build-time)      | Backend origin for the `/api/v1` and `/storage` rewrites in `restaurant-frontend/next.config.ts`, e.g. `https://api.your-domain.com`. Must be set at build time; production builds fail without it. |
| `NEXT_PUBLIC_API_URL`     | No — leave UNSET in production | Client API base URL in `src/lib/utils/constants.ts`, defaults to `/api/v1` (same-origin proxy). Leave unset in production so requests go through the Next.js rewrites and the `auth_token` cookie (`SameSite=Lax` in `restaurant-backend/app/Support/AuthCookie.php`) is sent. Setting it to a cross-origin URL breaks auth because Lax cookies are not sent on cross-origin requests. |

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
2. Set `NEXT_PUBLIC_BACKEND_URL` to the deployed backend origin (e.g. `https://api.your-domain.com`) — must be a build-time env var; production builds fail without it.
3. Leave `NEXT_PUBLIC_API_URL` UNSET so the client uses `/api/v1` (same-origin proxy). Setting it to a cross-origin URL breaks auth because the `auth_token` cookie is `SameSite=Lax` (see `restaurant-backend/app/Support/AuthCookie.php`) and will not be sent on cross-origin requests.
4. Build command `npm run build`, output directory defaults to `next build`.

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

### Backend → HostForge

HostForge backend runtime vars (set in the HostForge dashboard, never in the repo):

| Variable                  | Required | Value / Notes                                                        |
| ------------------------- | -------- | -------------------------------------------------------------------- |
| `APP_KEY`                 | Yes      | `php artisan key:generate --show`, then paste the value.             |
| `APP_ENV`                 | Yes      | `production`.                                                        |
| `APP_DEBUG`               | Yes      | `false`.                                                             |
| `APP_URL`                 | Yes      | Public URL of the backend (e.g. `https://api.your-domain.com`).      |
| `DB_CONNECTION`           | Yes      | `pgsql`.                                                             |
| `DB_HOST`                 | Yes      | Postgres host.                                                       |
| `DB_PORT`                 | Yes      | `5432` (or provider-supplied port).                                  |
| `DB_DATABASE`             | Yes      | Postgres database name.                                              |
| `DB_USERNAME`             | Yes      | Postgres user.                                                       |
| `DB_PASSWORD`             | Yes      | Postgres password.                                                   |
| `CORS_ALLOWED_ORIGINS`    | Yes      | Comma-separated exact frontend origins (e.g. `https://app.your-domain.com`). |
| `ADMIN_EMAIL`             | Yes      | Seeded admin email (used by `ProductionBootstrapSeeder`).            |
| `ADMIN_PASSWORD`          | Yes      | Seeded admin password.                                               |
| `SESSION_SECURE_COOKIE`   | Yes      | `true` (required so the `auth_token` cookie is `Secure` in production). |

**Persistent storage (deploy requirement):** uploaded menu images are stored by
`ItemController.php::uploadImage()` to the `public` disk
(`storage/app/public`, served via `public/storage` as `/storage/menu-items/...`).
They are lost on redeploy unless HostForge has a persistent volume mounted at
`restaurant-backend/storage/app/public` (container path `/var/www/storage/app/public`).
Mount that volume before go-live; the `Dockerfile` runs
`php artisan storage:link` at build time and re-creates the `public/storage`
symlink at boot (`ln -sfn` fallback in `CMD`) so the volume is served correctly.

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