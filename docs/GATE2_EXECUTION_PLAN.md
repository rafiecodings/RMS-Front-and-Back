# Gate 2 Execution Plan

> Gate 1 is approved. This roadmap breaks Gate 2 into small, verifiable milestones.
> Standing rules that carry over: stop after each subtask and provide a verification report before continuing; get approval between tasks; never deploy without explicit request; keep API response contracts stable; preserve frontend compatibility.

---

## Execution Principles

1. **Small batches** — each milestone ends with a verification report and a commit.
2. **No silent fixes** — any additional bug found is logged to the Technical Debt Report before fixing.
3. **Contracts first** — never change a response shape without updating the frontend consumer in the same batch.
4. **DB safety** — no destructive DB operations; all data repair uses backups + dry-runs + audit log.
5. **Tests as you go** — expand the automated suite (TD-05) alongside each milestone so Gate 2 ends with regression coverage rather than manual-only verification.

---

## Milestone A — Fix all remaining HTTP 500 errors

**Goal:** Every API endpoint returns a defined 4xx/2xx — zero 500s.

| Task | Detail | Effort |
|---|---|---|
| A1 | Fix `GET /api/v1/menu/categories` (TD-01): `MenuCategory::items()` → `hasMany(MenuItem::class, 'category_id')`. Verify `/menu/categories` and `/menu/items` return 200. | 5–15 min |
| A2 | Fix `GET /api/v1/staff/schedule` (TD-02): reorder `routes/api/staff.php` so literal paths (`/schedule`, `/clock-in`, `/clock-out`) are declared before `/{id}`. Verify schedule + staff detail. | 5–15 min |
| A3 | Sweep all 173 API routes with an unauthenticated + role-guest + admin smoke probe (scripted) to catch any remaining 500s across every domain (menu, kot, pos, inventory, staff, admin, reports, integration, tables, reservations). Fix each deterministically. | 4–8 h |
| A4 | Verify no stack traces / file paths leak in `APP_DEBUG=true` for any response. | 1 h |

**Exit criteria:** scripted route probe shows 0×500 across all routes × {unauth, guest, admin}.

**Note:** TD-02's root cause (route ordering) also means other literal-vs-`{id}` collisions may exist (e.g., `reservations`, `tables`, `inventory`). A3 is the systematic sweep.

---

## Milestone B — Implement all missing backend endpoints

**Goal:** Every frontend screen calls a working backend contract.

| Task | Detail | Effort |
|---|---|---|
| B1 | Build the **endpoint ↔ page contract matrix** (TD-18): enumerate every `src/lib/api` call + every feature hook and map to a route. Flag: 404s, 405s, missing routes, wrong verbs, wrong payload keys. | 1 day |
| B2 | Implement **password reset** (TD-06): `POST /auth/forgot-password`, `POST /auth/reset-password` (+ notification), wire frontend `(auth)/forgot-password` + `(auth)/reset-password`. | 4–8 h |
| B3 | Implement/resolve any other missing endpoints found in B1 (e.g., billing/refunds, waitlist, reservations, analytics screens that lack backends). Prefer confirming existing routes before writing new ones. | 1–2 days |
| B4 | Re-run the A3 probe after all new endpoints are added. | 1 h |

**Exit criteria:** contract matrix fully green; every frontend route has a working API; no missing endpoints.

---

## Milestone C — Complete HttpOnly cookie authentication (Item 2.4)

**Goal:** Token never readable from JavaScript; cookie-based session; CSRF-safe.

| Task | Detail | Effort |
|---|---|---|
| C1 | Design: Sanctum `statefulApi` + cookie guard, or custom HttpOnly bearer-cookie middleware. Decide TTL, refresh strategy, SameSite (`Lax`/`None`+Secure), domain config. | 2 h |
| C2 | Backend: switch login/logout/refresh to set/clear HttpOnly cookies; add CSRF token endpoint + validation; update `bootstrap/app.php` stateful wiring, `config/auth.php`, `config/sanctum.php`, CORS credentials. | 1 day |
| C3 | Frontend: replace localStorage token interceptor with `withCredentials` axios client + CSRF header; update auth hooks and 401 re-auth handling. | 4–8 h |
| C4 | Security review: verify token absent from JS bundle, cookie flags (`HttpOnly`, `Secure` in prod, `SameSite`), CSRF enforced, refresh rotation, logout revokes. | 2 h |
| C5 | Regression: full auth flow (login/logout/refresh/profile) + spot-check every milestone-A endpoint still 200 with cookies. | 2 h |

**Exit criteria:** bearer token not readable via `document.cookie` or devtools storage; all protected endpoints work with cookies; login throttle intact.

**Watch:** `CORS_SUPPORTS_CREDENTIALS=true` already in `.env.example` (2.5) — credentials mode is ready.

---

## Milestone D — Repair historical data safely

**Goal:** Financial data is internally consistent without destructive changes.

| Task | Detail | Effort |
|---|---|---|
| D1 | Full inventory (not just the 4 known orders): find all rows where `subtotal ≠ Σ items`, missing modifier snapshots, orphaned/dangling FKs, invoice/payment imbalance, `used_count` vs order anomalies. | 4 h |
| D2 | Define repair policy per class of issue (e.g., recompute `subtotal` from items; backfill missing pivot `name`/`price` from current menu where defensible; reconcile invoice balances). Record decisions in a changelog. | 2 h |
| D3 | Write one-off backfill script with **dry-run mode** + before/after audit rows; run on a DB copy first. | 4–8 h |
| D4 | Apply to live DB after approval; verify with the integrity checks from Gate 1 (orphans, totals, invoices, negatives). | 2 h |
| D5 | Update seed data so fresh installs are consistent from day one. | 1 h |

**Exit criteria:** integrity SQL returns 0 mismatches (excluding documented, reviewed exceptions); every change is auditable.

---

## Milestone E — Final API contract verification

**Goal:** Signed-off, documented contract for every endpoint.

| Task | Detail | Effort |
|---|---|---|
| E1 | Produce a versioned **API contract document** (method, path, auth/role, request schema, response schema, error codes) for all 179 routes. | 1 day |
| E2 | Verify response shape consistency (e.g., pagination `{items,pagination}`, `success`/`message`/`data` envelope, ISO dates, `amount` as number). Fix inconsistencies. | 4–8 h |
| E3 | Verify HTTP semantics: 401 vs 403 vs 404 vs 409 vs 422, idempotency of PUT/DELETE, safe GETs, `throttle` headers. | 4 h |
| E4 | Verify CORS (allowed origins incl. Vercel preview patterns), content-type, and no-cache on auth-sensitive endpoints. | 1 h |
| E5 | Export a Postman/OpenAPI collection from the verified contract for the team. | 2 h |

**Exit criteria:** documented contract matches live behavior 1:1; no undocumented deviations.

---

## Milestone F — Full regression testing

**Goal:** Everything works end-to-end and stays working.

| Task | Detail | Effort |
|---|---|---|
| F1 | Expand automated tests (TD-05): feature tests for pricing/tamper scenarios, discount rules + concurrency, role middleware matrix (TD-07), throttle, cookie auth, orphan-free transactions. | 1–2 days |
| F2 | Frontend build + type check + lint: `npx tsc --noEmit`, `npm run build`, `npm run lint`. | 1 h |
| F3 | End-to-end smoke script across all frontend pages against the live API (login, orders, POS, inventory, staff, reports, settings). | 4 h |
| F4 | Re-run Gate 1 financial scenario battery (16 scenarios) to confirm no regression from Gate 2 changes. | 1 h |
| F5 | Performance re-measure (query counts) on order creation; confirm no N+1 introduced. | 1 h |
| F6 | Update RELEASE_SNAPSHOT + GATE2_COMPLETION_SUMMARY; final sign-off checklist. | 1 h |

**Exit criteria:** all automated tests green, `tsc`/`build`/`lint` clean, manual smoke matrix green, financial battery green.

---

## Suggested Sequencing & Dependencies

```
Gate 2
 ├─ Milestone A  (P0 500s)          ── no dependencies
 ├─ Milestone B  (missing endpoints)── needs A (stable base)
 ├─ Milestone C  (cookie auth)      ── can run in parallel with B; needs A
 ├─ Milestone D  (data repair)      ── needs A (clean reads); independent of B/C
 ├─ Milestone E  (contract verify)  ── needs A+B (+C if it changes auth)
 └─ Milestone F  (regression)       ── needs A–E
```

**Recommended order: A → B → D → C → E → F** (repair data before rewriting auth to reduce test churn; cookie auth last of the feature work so contract verification covers the final auth model).

---

## Definition of Done for Gate 2

- [ ] 0×500 across all 179 routes (scripted probe + tests)
- [ ] Every frontend page has a working backend contract
- [ ] HttpOnly cookie auth live; no token in JS-readable storage
- [ ] Historical financial data repaired and documented
- [ ] API contract document matches live behavior
- [ ] Automated suite + tsc/build/lint + financial battery all green
- [ ] RELEASE_SNAPSHOT updated; single clean commit per milestone (or per approved batch)
