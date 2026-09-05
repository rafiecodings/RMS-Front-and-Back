# Release Snapshot

> Generated: 2026-08-05 (Gate 1 approved)
> Scope: Restaurant Management System (RMS) — snapshot at the moment Gate 1 was approved, before Gate 2 work begins.

## 1. Current Project Architecture

Two-repository monorepo layout at `D:\RMS`:

```
┌─────────────────────────────┐        HTTPS/JSON (REST)        ┌─────────────────────────────┐
│  restaurant-backend         │ ◄─────────────────────────────► │  restaurant-frontend        │
│  Laravel 12 API             │        Bearer token (Sanctum)   │  Next.js 16 (App Router)    │
│  PHP ^8.2, PostgreSQL       │                                │  React 19, React Query      │
│  Docker/Render deployment   │                                │  Vercel deployment          │
└─────────────────────────────┘                                └─────────────────────────────┘
```

### Backend
- **Framework:** Laravel 12 (PHP ^8.2), Sanctum 4.3 (bearer-token auth), Tinker.
- **Database:** PostgreSQL 14 (`rms_database` on `127.0.0.1:5432`).
- **Routing:** All API under `/api/v1`, loaded by `routes/api.php` from 14 domain route files.
- **Architecture:** Controllers → Models (`BaseModel` with UUID `HasUuid` trait), plus skeleton `Repositories/`, `Requests/`, `Resources/`, `Services/` layers (mostly empty placeholders — only `BaseService` + `PricingService` exist).
- **Auth:** Sanctum personal access tokens; login rate-limited (`throttle:login`); role middleware (`role:admin,manager`) alias registered in `bootstrap/app.php`.
- **Error handling:** Centralized JSON exception renderer in `bootstrap/app.php` (clean messages in both `APP_DEBUG` modes; 401/403/404/422/429/5xx mapped).
- **CORS:** Fully env-driven (`config/cors.php`) — origins, patterns, credentials, max-age from env.
- **Server-side pricing:** `app/Services/PricingService.php` — server-authoritative prices, modifier snapshots, discount resolution, totals (Gate 1).

### Frontend
- **Framework:** Next.js 16.2.11 (App Router), React 19.2.4, TypeScript 5, Tailwind 4, shadcn/ui.
- **Data layer:** @tanstack/react-query 5, axios (interceptor-managed bearer token).
- **Structure:** Route groups `(auth)` and `(protected)`; feature folders under `src/features/*` (components + hooks); shared `src/lib/{api,hooks,schemas,types,utils}`.
- **Auth flow:** Login → token stored client-side → React Query auth hooks → role-filtered sidebar.

## 2. Current Folder Structure

### `D:\RMS`
```
D:\RMS\
├── docs\                          # Project documentation (this folder)
│   ├── RMS_SYSTEM_DESIGN.md
│   ├── RELEASE_SNAPSHOT.md
│   ├── GATE1_COMPLETION_SUMMARY.md
│   ├── TECHNICAL_DEBT_REPORT.md
│   └── GATE2_EXECUTION_PLAN.md
├── restaurant-backend\
└── restaurant-frontend\
```
> Workspace note: stray artifacts `D:\RMS\nul` and `D:\RMS\D_RMSres_test.json` exist at the workspace root (Windows redirect leftovers). Safe to delete.

### `D:\RMS\restaurant-backend\app`
```
app\
├── Console\Commands\SyncDemoRoles.php      # 2.2 credential/role sync command
├── Events\                                 # (empty)
├── Helpers\                                # (empty)
├── Http\
│   ├── Controllers\Api\V1\
│   │   ├── Admin\        (6 controllers: AuditLog, Outlet, Permission, Role, Setting, User)
│   │   ├── Auth\         (4: Login, Logout, Profile, RefreshToken)
│   │   ├── Customer\     (CustomerController)
│   │   ├── Dashboard\    (DashboardController)
│   │   ├── Integration\  (IntegrationController)
│   │   ├── Inventory\    (6: Ingredient, PurchaseOrder, Recipe, Stock, Supplier, Wastage)
│   │   ├── KOT\          (KOTController)
│   │   ├── Menu\         (4: Category, Combo, Item, Modifier)
│   │   ├── Order\        (OrderController)
│   │   ├── POS\          (6: CashRegister, Discount, GiftCard, Invoice, Payment)
│   │   ├── Reports\      (ReportController)
│   │   ├── Staff\        (StaffController)
│   │   ├── Table\        (4: FloorPlan, Reservation, Table, Waitlist)
│   │   └── Controller.php                 # base
│   ├── Middleware\RoleMiddleware.php       # 2.1 role enforcement
│   ├── Requests\  (1 file across Admin/Auth/… placeholders)
│   └── Resources\ (1 file across domain placeholders)
├── Models\            (41 models + Concerns\HasUuid.php)
├── Notifications\     (empty)
├── Observers\         (empty)
├── Policies\          (empty)
├── Providers\         (AppServiceProvider)
├── Repositories\      (2 files, domain placeholder dirs)
├── Services\
│   ├── BaseService.php
│   ├── PricingService.php                  # 2.3 server-authoritative pricing (NEW)
│   └── (Admin, Auth, Customer, … placeholder dirs)
└── Traits\            (empty)
```

### `D:\RMS\restaurant-backend` (root)
```
routes\
├── api.php            # loads all /api/v1/* domain files
├── api\               # auth, dashboard, customers, tables, reservations, menu, orders,
│                      # kot, pos, inventory, staff, admin, reports, integration
├── console.php
└── web.php            # /, /health, /up
database\
├── migrations\        # 15 migrations (all ran)
└── seeders\           # DatabaseSeeder, ProductionDataSeeder
config\                # cors.php (env-driven, NEW), auth.php (2.6), …
tests\                 # Unit\ExampleTest, Feature\ExampleTest (2 tests)
Dockerfile             # php:8.3-cli, artisan serve on :10000
docker\                # (empty)
```

### `D:\RMS\restaurant-frontend\src`
```
src\
├── app\
│   ├── (auth)\        # forgot-password, login, reset-password
│   ├── (protected)\   # analytics/*, billing/*, customers/*, dashboard, inventory/*,
│   │                  # kitchen, menu/*, orders/*, pos, profile, reports/*,
│   │                  # reservations/*, settings/*, staff/*, tables/*
│   └── unauthorized\
├── components\        # layout (Sidebar, …), shared, ui (shadcn)
├── features\          # analytics, billing, customers, dashboard, inventory, kitchen,
│                      # menu, orders, pos, reports, reservations, settings, staff, tables
│                      #   (each: components/ + hooks/)
├── lib\               # api (axios), hooks (React Query), schemas (zod), types, utils
└── providers\
```

## 3. Git Commit Hashes

| Repo | Commit | Short | Date | Subject |
|---|---|---|---|---|
| Backend | `83fb1759bead25bf430465b6c385a82b4ce80552` | `83fb175` | 2026-08-05 03:11 | feat(security): complete Gate 1 security hardening and server-side pricing |
| Frontend | `2b78967d81ba3efc0ee86f7dcf4e97f0aa1f8f4c` | `2b78967` | 2026-08-05 03:11 | feat(security): apply Gate 1 security hardening (rate limit UX and role-based nav) |

Backend full history (newest → oldest): `83fb175` → `eb8fa6f` (Fix Gate 0 critical boot bugs) → `8117d0f` (health routes for Render) → `7d88c1b` (Dockerfile) → `8331eab` (Delete Dockerfile) → `8142d03` (Docker config) → `bf15cb8` (Initial commit).

Frontend history: `2b78967` → `7508ce3` (Prepare for Vercel deployment).

> Note: `restaurant-frontend/CLAUDE.md` has uncommitted local changes (deliberately not committed). No other uncommitted changes exist in either repo.

## 4. Database Migration Status

**15 migrations — all Ran. 0 pending.**

| # | Migration | Batch | Status |
|---|---|---|---|
| 1 | 0001_01_01_000000_create_users_table | 1 | Ran |
| 2 | 0001_01_01_000001_create_cache_table | 1 | Ran |
| 3 | 0001_01_01_000002_create_jobs_table | 1 | Ran |
| 4 | 2026_01_01_000001_create_roles_and_permissions_table | 1 | Ran |
| 5 | 2026_01_01_000002_create_customers_tables_table | 1 | Ran |
| 6 | 2026_01_01_000003_create_menu_tables | 1 | Ran |
| 7 | 2026_01_01_000004_create_orders_tables | 1 | Ran |
| 8 | 2026_01_01_000005_create_kot_tables | 1 | Ran |
| 9 | 2026_01_01_000006_create_pos_tables | 1 | Ran |
| 10 | 2026_01_01_000007_create_inventory_tables | 1 | Ran |
| 11 | 2026_01_01_000008_create_staff_tables | 1 | Ran |
| 12 | 2026_01_01_000009_create_settings_tables | 1 | Ran |
| 13 | 2026_07_27_054126_create_personal_access_tokens_table | 1 | Ran |
| 14 | 2026_07_30_000001_add_soft_deletes_to_kot_ticket_items | 2 | Ran |
| 15 | 2026_08_05_000001_add_soft_deletes_to_missing_tables | 3 | Ran |

## 5. Pending Migrations

**None.** `php artisan migrate:status` reports 0 pending.

## 6. Environment Variables Required

From `restaurant-backend/.env.example` (authoritative list). Secrets marked 🔒.

| Variable | Purpose | Notes |
|---|---|---|
| `APP_NAME` | App display name | |
| `APP_ENV` | `local` / `production` | |
| `APP_KEY` 🔒 | Laravel cipher key | run `php artisan key:generate` |
| `APP_DEBUG` | Exception verbosity | both modes produce clean API errors (2.5) |
| `APP_URL` | Canonical URL | |
| `ADMIN_PASSWORD` 🔒 | Seeded admin password | empty → random at seed (2.2) |
| `DEMO_USER_PASSWORD` 🔒 | Seeded demo user password | empty → random at seed (2.2) |
| `LOGIN_MAX_ATTEMPTS` | Login throttle max attempts (5) | 2.6 |
| `LOGIN_DECAY_MINUTES` | Login throttle window (1 min) | 2.6 |
| `CORS_ALLOWED_ORIGINS` | Comma-separated exact origins | 2.5 |
| `CORS_ALLOWED_ORIGINS_PATTERNS` | PCRE patterns for dynamic origins | 2.5 |
| `CORS_SUPPORTS_CREDENTIALS` | Cookies/Authorization cross-origin | 2.5 |
| `CORS_MAX_AGE` | Preflight cache seconds | 2.5 |
| `BCRYPT_ROUNDS` | Hash cost (12) | |
| `LOG_CHANNEL` / `LOG_LEVEL` | Logging | |
| `DB_CONNECTION` | `pgsql` (production) / `sqlite` (dev) | |
| `DB_HOST`, `DB_PORT`, `DB_DATABASE` 🔒, `DB_USERNAME` 🔒, `DB_PASSWORD` 🔒 | PostgreSQL connection | |
| `SESSION_DRIVER`, `SESSION_LIFETIME` | Session config | |
| `QUEUE_CONNECTION`, `CACHE_STORE` | `database` | |
| `REDIS_*` | Redis (unused default) | |
| `MAIL_*` | Mailer (`log` default) | |
| `AWS_*` | Object storage (unused default) | |

Frontend (`restaurant-frontend/.env.local`):
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL consumed by the axios client |

## 7. Current Deployment Configuration

### Backend — Render (Docker)
- `Dockerfile`: `php:8.3-cli`, installs `pdo_pgsql`, `composer install --no-dev`, `EXPOSE 10000`, CMD `php artisan serve --host=0.0.0.0 --port=10000`.
- Health checks: `GET /health` (JSON status/timestamp/app/version) and `GET /up` — both `Cache-Control: no-cache` (`routes/web.php`).
- `.dockerignore` present. `docker/` directory is empty (placeholder).
- DB is external PostgreSQL; env vars injected via Render service settings from `.env.example` key set.
- ⚠️ Uses single-process `artisan serve` (not nginx/php-fpm/opcache). `PHP_CLI_SERVER_WORKERS` is commented out in `.env.example` and unsupported on Windows dev.

### Frontend — Vercel
- `next.config.ts` is default/empty; deployment prepared in commit `7508ce3`.
- `NEXT_PUBLIC_API_URL` set in Vercel env; API origin must appear in `CORS_ALLOWED_ORIGINS`/`CORS_ALLOWED_ORIGINS_PATTERNS`.

## 8. Current API Route Count

**179 routes total (173 under `/api/v1`).**

| Method | Count |
|---|---|
| GET | 81 |
| POST | 56 |
| PUT | 22 |
| DELETE | 13 |
| PATCH | 7 |

Web routes: `GET /`, `GET /health`, `GET /up` (+ framework routes).

## 9. Current Model Count

**42 model-layer files:** 41 Eloquent models + 1 trait (`Concerns\HasUuid.php`).

Domain models: Attendance, AuditLog, CashRegisterSession, Customer, Discount, FloorPlan, GiftCard, Ingredient, Invoice, KotTicket, KotTicketItem, MenuCategory, MenuCombo, MenuItem, MenuModifier, Order, OrderItem, OrderStatusHistory, Outlet, Payment, Permission, PurchaseOrder, PurchaseOrderItem, Recipe, Refund, Reservation, RestaurantSetting, Role, ShiftSchedule, StaffCommission, StaffPerformance, StaffProfile, StaffShift, StockMovement, Supplier, Table, TaxSetting, User, Waitlist, Wastage + `BaseModel`.

## 10. Current Controller Count

**37 controllers:** 1 base `Controller` + 36 domain controllers under `Api/V1` (Admin 6, Auth 4, Customer 1, Dashboard 1, Integration 1, Inventory 6, KOT 1, Menu 4, Order 1, POS 6, Reports 1, Staff 1, Table 4).

## 11. Current Service Count

**2 services:** `BaseService` (abstract base) and `PricingService` (Gate 1 server-authoritative pricing). All `app/Services/*` subdirectories (Admin, Auth, Customer, Dashboard, Inventory, KOT, Menu, Order, POS, Staff, Table) are empty placeholders.

## 12. Other Application Metrics (for completeness)

| Metric | Count |
|---|---|
| Migration files | 15 (all ran) |
| Console commands | 1 (`SyncDemoRoles`) |
| Middleware | 1 (`RoleMiddleware`) |
| Form Requests | 1 |
| API Resources | 1 |
| Repositories | 2 |
| Route files (`routes/api/`) | 14 |
| Automated tests | 2 (Unit/Feature ExampleTest) |
| Frontend pages (`src/app`) | ~85 route directories |
| Frontend feature modules (`src/features`) | 14 |
