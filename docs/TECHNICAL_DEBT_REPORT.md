# Technical Debt Report

> Generated 2026-08-05 at the Gate 1 release checkpoint. Every known issue is listed with severity, root cause, affected files, estimated effort, and risk. Grouped by priority (P0 = blocks release; P1 = should fix before production; P2 = improve later).

---

## Priority P0 — Blocks release / live 500s

### TD-01: `GET /api/v1/menu/categories` returns 500
- **Severity:** High (live 500 on a core menu screen)
- **Root cause:** `MenuCategory::items()` uses the Eloquent default FK `menu_category_id`, but the schema column is `category_id` (migration `2026_01_01_000003_create_menu_tables.php:25`). `withCount('items')` generates `WHERE menu_items.menu_category_id = ?` → PostgreSQL "column does not exist" → 500.
- **Affected files:** `app/Models/MenuCategory.php:21` (`items()` relation)
- **Estimated effort:** 5–15 min (one-line FK arg + regression check)
- **Risk level:** Low (single-line, deterministic fix; verify `/menu/categories` and `/menu/items` still 200)

### TD-02: `GET /api/v1/staff/schedule` returns 500
- **Severity:** High (live 500 on the staff schedule screen)
- **Root cause:** Route ordering — `Route::get('/{id}', …)` at `routes/api/staff.php:9` is registered before `Route::get('/schedule', …)` at `:14`. `GET /staff/schedule` is captured by `/{id}` with `id='schedule'` → `show('schedule')` → UUID lookup on a non-UUID string → 500/422.
- **Affected files:** `routes/api/staff.php` (move literal routes before `/{id}`)
- **Estimated effort:** 5–15 min
- **Risk level:** Low

---

## Priority P1 — Must fix before production

### TD-03: Item 2.4 — HttpOnly cookie authentication not implemented
- **Severity:** High (XSS can read the bearer token from localStorage)
- **Root cause:** Auth still uses Sanctum personal access tokens stored client-side (`localStorage`) by the frontend axios interceptor.
- **Affected files:** `app/Http/Controllers/Api/V1/Auth/*` (login/logout/refresh/profile), `bootstrap/app.php` (stateful/cookie guard wiring), `config/auth.php`, `config/cors.php` (credentials), frontend `src/lib/api/*` + `src/features/auth` hooks
- **Estimated effort:** 1–2 days (auth flow, CSRF handling, logout/refresh, frontend interceptor rework, cookie SameSite/secure config)
- **Risk level:** Medium (auth flow changes affect every request; requires full regression)

### TD-04: Historical financial data inconsistency (pre-2.3)
- **Severity:** Medium-High (4 orders show `subtotal ≠ Σ items`)
- **Root cause:** Orders `ORD-00517`, `ORD-00346`, `ORD-00703`, `ORD-00224` (created Jul 25–29) were written by pre-2.3 code that trusted client-supplied `unit_price`; order subtotal disagrees with stored item totals. (Order-level `total` still matches `subtotal − discount + SC + tax`.)
- **Affected files:** Database rows only (no code); repair via a reviewed one-off backfill script + audit log entry
- **Estimated effort:** 4–8 hours (inventory the full historical set, decide subtotal-vs-items policy, dry-run, backfill, verify, document)
- **Risk level:** Medium (financial data; must run on a copy first, keep backups, and record before/after)

### TD-05: No automated tests for security hardening
- **Severity:** Medium (only 2 example tests exist)
- **Root cause:** Test suite was never expanded; Gate 1 was verified manually via live API batteries.
- **Affected files:** `tests/` (add Feature tests: pricing tamper, discounts, role middleware, throttle, orphan-free transactions)
- **Estimated effort:** 1–2 days for a core regression suite (feature tests + Postgres test DB)
- **Risk level:** High if skipped (regression risk across Gate 2 changes)

### TD-06: Password reset / forgot-password endpoints missing
- **Severity:** Medium (frontend `(auth)/forgot-password` and `(auth)/reset-password` pages exist but have no backend API; no `password/reset` routes found)
- **Root cause:** Auth module was implemented with login/logout/profile/refresh only.
- **Affected files:** `routes/api/auth.php`, new `Auth` controllers, `app/Notifications` (reset links), frontend `src/app/(auth)/forgot-password` + `reset-password` pages, `src/lib/api`
- **Estimated effort:** 4–8 hours
- **Risk level:** Medium

### TD-07: Security middleware coverage not systematically verified across all 179 routes
- **Severity:** Medium (role middleware applied selectively; no contract test proving which routes are public vs role-guarded)
- **Root cause:** Routes were hardened per-domain by hand; no exhaustive matrix or tests exist.
- **Affected files:** `routes/api/*`, `tests/`
- **Estimated effort:** 4–8 hours (route-matrix audit + automated coverage test)
- **Risk level:** Medium (missed role exposure is a privilege-escalation risk)

---

## Priority P2 — Improve later

### TD-08: Discount exceeding subtotal is silently capped (not rejected)
- **Severity:** Low
- **Root cause:** `PricingService::orderTotals()` / `resolveDiscount()` clamp `amount = min(amount, subtotal)` (cap-at-subtotal design, matches legacy seed convention; supports 100%-off promos).
- **Affected files:** `app/Services/PricingService.php:146` (also `:166`)
- **Estimated effort:** 30 min to flip to rejection if policy changes
- **Risk level:** Low

### TD-09: Postgres schema-introspection query per INSERT (`select a.attname …`)
- **Severity:** Low (adds ~1 query per table per INSERT)
- **Root cause:** Laravel/Postgres `getSchemaForColumns` runs during inserts to resolve columns.
- **Affected files:** framework behavior (affects `OrderController`, all models)
- **Estimated effort:** Medium (investigate `Schema` caching / upgrade path; out of app scope)
- **Risk level:** Low

### TD-10: No inventory deduction on order creation
- **Severity:** Medium (stock is not decremented when an order is placed)
- **Root cause:** `store()` never touches `ingredients`/`stock_movements`; recipes exist but aren't consumed.
- **Affected files:** `OrderController::store`, `app/Services/PricingService.php`, `app/Models/Recipe.php`, `Inventory/*`
- **Estimated effort:** 1–2 days
- **Risk level:** Medium (requires transactional stock updates + rollback rules for void/cancel)

### TD-11: Payment APIs don't return cash "change"
- **Severity:** Low
- **Root cause:** `pay`/`PaymentController` store the payment and mark invoice paid; no tendered/change fields.
- **Affected files:** `OrderController::pay`, `app/Http/Controllers/Api/V1/POS/PaymentController.php`, frontend `src/features/pos`
- **Estimated effort:** 4–8 hours
- **Risk level:** Low

### TD-12: `.env.example` defaults to `DB_CONNECTION=sqlite` while production uses Postgres
- **Severity:** Low (misleading for new environments)
- **Root cause:** Laravel default example never updated for the Postgres deployment.
- **Affected files:** `restaurant-backend/.env.example`
- **Estimated effort:** 15 min
- **Risk level:** Low

### TD-13: Single-process dev/deploy server (no nginx/php-fpm/opcache)
- **Severity:** Low-Medium
- **Root cause:** `Dockerfile` runs `php artisan serve` on `:10000`; `PHP_CLI_SERVER_WORKERS` commented and unsupported on Windows dev.
- **Affected files:** `Dockerfile`, `.env.example`, deployment service config
- **Estimated effort:** Medium (switch to php-fpm/nginx or Octane for multi-worker; optional)
- **Risk level:** Low (works; throughput/serialization limits in production)

### TD-14: Throttling only covers login
- **Severity:** Low-Medium
- **Root cause:** `throttle:login` applied to `/auth/login` only; refresh/profile/logout and high-risk write endpoints unthrottled.
- **Affected files:** `routes/api/auth.php`, `routes/api/*`, `bootstrap/app.php`
- **Estimated effort:** 2–4 hours
- **Risk level:** Low

### TD-15: Token lifecycle gaps (no expiry/revocation on password change)
- **Severity:** Medium
- **Root cause:** Sanctum tokens persist; password change does not revoke existing tokens; no token TTL configured.
- **Affected files:** `Auth/ProfileController`, `app/Models/User.php`, `config/sanctum.php`
- **Estimated effort:** 2–4 hours
- **Risk level:** Medium

### TD-16: Stray workspace artifacts
- **Severity:** Cosmetic
- **Root cause:** Windows redirect artifacts from CLI work.
- **Affected files:** `D:\RMS\nul`, `D:\RMS\D_RMSres_test.json`
- **Estimated effort:** 5 min to delete
- **Risk level:** None

### TD-17: Frontend Next.js 16 custom build (breaking changes) + empty `next.config.ts`
- **Severity:** Low (informational)
- **Root cause:** Project pins a future Next.js (16.2.11) with breaking changes vs. training data; `AGENTS.md` mandates reading bundled docs. `next.config.ts` is default.
- **Affected files:** `next.config.ts`, `package.json`, `AGENTS.md`
- **Estimated effort:** n/a
- **Risk level:** Low

### TD-18: Endpoint existence not yet contract-audited (billing/refunds/waitlist/reservations/analytics)
- **Severity:** Medium (some frontend screens may call endpoints that return 404/500)
- **Root cause:** Frontend surface (~85 pages) predates systematic backend contract verification; only order/menu/auth flows were verified in Gate 1.
- **Affected files:** `routes/api/*`, `src/features/*/hooks`, `src/lib/api`
- **Estimated effort:** 1–2 days (Milestones B + E)
- **Risk level:** Medium

---

## Summary Table

| ID | Issue | Priority | Severity | Effort | Risk |
|----|-------|----------|----------|--------|------|
| TD-01 | `/menu/categories` 500 (FK) | P0 | High | 5–15 min | Low |
| TD-02 | `/staff/schedule` 500 (route order) | P0 | High | 5–15 min | Low |
| TD-03 | HttpOnly cookie auth (2.4) | P1 | High | 1–2 d | Medium |
| TD-04 | Historical financial inconsistency | P1 | Med-High | 4–8 h | Medium |
| TD-05 | No automated tests | P1 | Medium | 1–2 d | High |
| TD-06 | Password reset endpoints missing | P1 | Medium | 4–8 h | Medium |
| TD-07 | Route security coverage unverified | P1 | Medium | 4–8 h | Medium |
| TD-08 | Discount > subtotal caps silently | P2 | Low | 30 min | Low |
| TD-09 | Schema introspection per INSERT | P2 | Low | Medium | Low |
| TD-10 | No inventory deduction | P2 | Medium | 1–2 d | Medium |
| TD-11 | No cash "change" in payments | P2 | Low | 4–8 h | Low |
| TD-12 | `.env.example` DB default mismatch | P2 | Low | 15 min | Low |
| TD-13 | Single-process server | P2 | Low-Med | Medium | Low |
| TD-14 | Throttle only on login | P2 | Low-Med | 2–4 h | Low |
| TD-15 | Token lifecycle gaps | P2 | Medium | 2–4 h | Medium |
| TD-16 | Stray `nul`/test JSON artifacts | P2 | Cosmetic | 5 min | None |
| TD-17 | Next.js 16 custom build notes | P2 | Low | n/a | Low |
| TD-18 | Endpoint contract audit pending | P2 | Medium | 1–2 d | Medium |
