# Gate 1 Completion Summary

> Gate 1 (Items 2.1, 2.2, 2.3, 2.5, 2.6) is **complete and approved**. Item 2.4 (HttpOnly cookie auth) is deferred to Gate 2.
> Verified 2026-08-05. Backend commit `83fb175`, frontend commit `2b78967`.

---

## Bugs Fixed

| Bug | Root cause | Fix | Where |
|---|---|---|---|
| **Order data corruption on failed discount claim (CRITICAL)** | `store()` returned (not threw) from the `DB::transaction` closure when the guarded `increment('used_count')` hit 0 rows. Laravel COMMITS on closure return → order + items persisted despite a 422 response. | Throw `ValidationException` inside the transaction → full rollback → clean 422. | `app/Http/Controllers/Api/V1/Order/OrderController.php` |
| **`GET /menu/items` → 500** | `MenuItem::modifiers()` pivot FK order wrong (`('menu_item_modifiers','modifier_id','menu_item_id')`). | Pivot corrected to `('menu_item_modifiers','menu_item_id','modifier_id')`. | `app/Models/MenuItem.php` |
| **Modifier price/name lost on orders** | `OrderItem::modifiers()` pivot had wrong FK order and no pivot columns. | Pivot corrected + `withPivot('name','price')` so order snapshots retain historical modifier data. | `app/Models/OrderItem.php` |
| **Client-supplied prices trusted** | `store()`/`addItem()`/`reorder()` accepted `items[].unit_price` from the client verbatim. | `unit_price` is now ignored; price is always recomputed from DB (`menu_items.price` + linked modifier prices) via `PricingService`. | `OrderController` + `app/Services/PricingService.php` |
| **Duplicate modifier IDs double-counted** | No dedupe → a modifier passed twice priced twice. | `array_unique()` on requested modifier IDs. | `PricingService::buildLineItem()` |
| **Gate 0 boot errors** (prior to this gate) | Skeleton/registration issues. | Fixed in commit `eb8fa6f`. | — |

---

## Security Fixes

- **Server-authoritative pricing (2.3):** all monetary values recomputed from the database; client price/quantity/totals manipulation is rejected or ignored. Tampered prices (1e12), negative prices, huge quantities, and invalid/dedup modifier payloads were all verified to be neutralized (16-scenario battery).
- **Role-based access control (2.1):** `role:admin,manager` middleware enforced on admin + reports controllers and on destructive verbs (POST/PUT/PATCH/DELETE) in staff/menu/table/etc. Admin routes require admin-only. Frontend `Sidebar.tsx` hides unauthorized nav.
- **CORS lockdown (2.5):** origins, patterns, credentials and preflight cache are 100% env-driven (`config/cors.php`); the old permissive `CorsMiddleware` was deleted. `CORS_SUPPORTS_CREDENTIALS` defaults to `true` in the example to support the upcoming 2.4 cookie auth.
- **Clean error responses (2.5):** a single API exception renderer in `bootstrap/app.php` returns sanitized JSON in BOTH `APP_DEBUG` modes — no stack traces, file paths, or SQL leaks to clients (401/403/404/422/429/5xx all mapped).
- **Login brute-force protection (2.6):** `POST /auth/login` throttled to `LOGIN_MAX_ATTEMPTS` (5) per `LOGIN_DECAY_MINUTES` (1 min) per email + IP → 429 with clean body; frontend login page surfaces the 429 state.
- **Credential hygiene (2.2):** seeded admin/demo passwords come from `ADMIN_PASSWORD`/`DEMO_USER_PASSWORD` or are randomly generated and printed once at seed time; `rms:sync-roles` command idempotently syncs roles/permissions.

---

## Performance Improvements

- **No N+1 on order creation:** menu items are eager-loaded with modifiers in a single query; each line item re-uses the loaded relation (per-item modifier lookup is O(items), not O(modifiers)).
- **Fast reject paths:** validation failures (bad item, inactive item, discount errors) short-circuit before any writes — measured 3–4 queries on rejections.
- **Measured query counts per request** (via HTTP kernel + query log):
  - 1-item order, no discount: **15 queries** (~150 ms first-hit incl. boot; ~31 ms warm).
  - 2 items + modifiers: **23 queries** (~31 ms).
  - Discount rejection: **4 queries** (~10 ms).
  - Inactive-item rejection: **3 queries** (~4 ms).
- Remaining framework-level cost: 1 `select a.attname` schema-introspection query per INSERT on Postgres (Laravel/Postgres behavior) — noted as tech debt, not introduced by Gate 1.

---

## Financial Integrity Improvements

- **Single source of truth:** all prices, taxes, service charges, discounts, and totals are computed server-side from DB state and current `RestaurantSetting`s.
- **Modifier snapshots:** `order_item_modifiers` stores `name` + `price` at order time, so later menu edits cannot retroactively change billed amounts.
- **Overflow guards:** per-line total cap (> `99,999,999.99`) and order subtotal cap (> `9,999,999,999.99`).
- **Discount rules enforced:** active flag, start/end dates, `max_uses`, `min_order_amount`, `max_discount_amount`, id/code match, and discount capped at subtotal (no negative totals; never a client-set amount).
- **Atomic discount claims:** `UPDATE discounts SET used_count = used_count + 1 WHERE used_count < max_uses` inside the order transaction. Verified under real DB concurrency (10 parallel workers → exactly 1 claim) and via two live server processes (12 parallel requests → exactly 1×201, 11×422).
- **No partial writes:** verified deterministically that a failed claim after order/items creation rolls back every row; orphan checks returned 0 across all related tables.

---

## Authentication Improvements

- Login rate limiting (2.6) with env-tunable thresholds and clean 429 responses.
- Consistent 401 handling (unauthenticated JSON, no redirect/no stack).
- `/auth/profile` GET/PUT and `/auth/refresh` endpoints available (contract preserved).
- Clean error responses for auth failures in both debug modes.

---

## Authorization Improvements

- `role` middleware alias registered; applied to admin/reports controllers and destructive endpoints.
- Frontend nav filtered by role (`Sidebar.tsx`) so non-admin roles don't see admin/reports links.
- Role/credential seeding hardened (2.2) with idempotent sync command.

---

## Database Improvements

- `menu_item_modifiers` and `order_item_modifiers` pivot FK order corrected (both were swapped).
- `order_item_modifiers` now persists `name` + `price` snapshots.
- Post-migration soft-delete coverage added (`2026_08_05_000001_add_soft_deletes_to_missing_tables`, batch 3) and KOT item soft-deletes (batch 2).
- Integrity verification passed at the snapshot point:
  - 0 orphaned `order_items`, `order_item_modifiers`, `invoices`, `payments`, `order_status_history`.
  - 0 duplicate payments; 0 negative/overflow amounts; all invoice↔order totals consistent.
  - All NEW orders satisfy `subtotal = Σ items` and `total = subtotal − discount + SC + tax`.

---

## Known Issues NOT in Gate 1 Scope (see Technical Debt Report)

- `GET /menu/categories` → 500 (model FK mismatch) and `GET /staff/schedule` → 500 (route ordering) — both pre-existing, deferred to Gate 2 Milestone A.
- Historical orders (ORD-00517, ORD-00346, ORD-00703, ORD-00224, created Jul 25–29 by pre-2.3 client-price-trusting code) have `subtotal ≠ Σ items` — flagged for safe repair in Gate 2 Milestone D.
- Discount > subtotal currently caps at subtotal (total 0.00, no corruption) rather than rejecting — explicit design decision to record; revisit if stricter policy is desired.
