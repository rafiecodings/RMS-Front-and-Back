# Order Workflow — Test Scenarios

This document describes the **actual** implemented order → kitchen → payment workflow
in RMS as of this implementation. It reflects the enforced backend state machine and the
frontend screens (`PosOrderScreen`, `KanbanBoard`).

## Authoritative Status State Machine (backend `Order` model)

```
draft      → confirmed | cancelled
pending    → confirmed | cancelled
confirmed  → preparing  | cancelled   (confirmation auto-advances to preparing + creates KOT)
preparing  → ready      | cancelled
ready      → served     | cancelled
served     → completed
completed  → (terminal)
cancelled  → (terminal)
```

- Any invalid transition (including no-op / same-status) returns **HTTP 409**.
- Backend is authoritative: `Order::canTransitionTo()` is the single source of truth.
- The frontend never allows an illegal transition (the UI only exposes legal actions).
- New orders are created in `draft`; `pending` remains a valid (legacy/alternative)
  starting status that also advances via `confirmed`.

## KOT Status State Machine (backend `KotTicket` model)

```
received    → in_progress | voided
in_progress → ready       | voided
ready       → completed   | voided
completed   → (terminal)
voided      → (terminal)
```

## Order → Kitchen Automation

1. Waiter creates an order (`POST /api/v1/orders`) → status `draft`.
2. Waiter taps **Send to Kitchen** → `PATCH /api/v1/orders/{id}/status` with `confirmed`.
   - A KOT ticket is created (idempotent — a second confirm returns 409, so no duplicate KOT).
   - KOT status starts at `received`.
   - The order is auto-advanced to `preparing` (kitchen-triggering status).
3. Kitchen advances the KOT: `received` → `in_progress` → `ready`.
   - When the KOT reaches `ready`, the parent order is synced to `ready`.
4. Waiter/floor taps **Mark Served** → `ready` → `served` (food delivered to table).
5. Waiter/floor taps **Mark Completed** → `served` → `completed`.

## Manual Test Scenarios

### 1. Create menu item
- Admin/Manager: Menu → Items → New. Fill name, category, price. Save.
- Verify the item appears in the POS menu grid and is selectable.

### 2. Take a waiter order (POS)
- Go to Orders → New Order (renders `PosOrderScreen`).
- Pick order type (Dine In / Takeaway / Delivery).
- For Dine In, select a table. (No floor-plan UI — simple table selector.)
- Tap menu items to add them to the cart. Adjust quantity with +/−, set per-item notes.
- Tap **Send to Kitchen**.
- Expected: order created (`draft`) then confirmed (`preparing`); KOT created.

### 3. Kitchen receives the order
- Go to Kitchen Display.
- The new ticket appears under **NEW ORDERS** (KOT `received`).
- Columns: NEW ORDERS / PREPARING / READY.
- Each card shows order #, table, items, quantity, timer (red after 20 min), priority.

### 4. Kitchen advances the order
- Tap **Start Preparing** → card moves to PREPARING (KOT `in_progress`).
- Tap **Mark Ready** → card moves to READY (KOT `ready`); parent order becomes `ready`.
- Auto-refresh every 5s (or WebSocket when `NEXT_PUBLIC_WS_URL` is set).

### 5. Serve / complete
- From the order, `ready` → **Mark Served** → `served` (food delivered to the table).
- Then `served` → **Mark Completed** → `completed`.
- If payment is already settled, inventory is deducted for items with recipes when the
  order reaches `completed`.

### 6. Payment
- Pay the order via the order screen / POS.
- Payment method must be one of: cash, card, bank_transfer, digital_wallet,
  gift_card, loyalty_points, room_charge (the `corporate_account` option was removed
  from the UI to match the backend allow-list).
- Amount defaults to the remaining balance but is user-editable; it cannot exceed the
  remaining balance. A paid order cannot be paid twice (invoice status guard).

### 7. Inventory behavior
- Inventory is deducted once when an order reaches `completed` **and** payment is
  `paid`/`partial`.
- Completing an unpaid order does **not** deduct (payment not settled).
- Cancelling before completion creates no outward movement.
- Deduction is idempotent (re-running completion is blocked by the terminal state).

### 8. Cancellation
- Cancel from `draft`, `pending`, `confirmed`/`preparing`, `ready`, or `served` with a reason.
- Cancelled is terminal; further transitions are rejected (409).

### 9. Invalid transitions return 409
- e.g. `draft` → `ready`, `pending` → `ready`, `pending` → `completed`,
  `preparing` → `served`, `ready` → `completed` (must go through `served`),
  `served` → `preparing`, `completed` → `cancelled`. All return 409.

### 10. KOT multi-status filtering
- Kitchen list calls `GET /api/v1/kot?status=received,in_progress,ready`.
- The backend parses the comma list into a `whereIn()`, so all three statuses are
  returned. (Verified in `KOTController::index`.)

### 11. Mobile & desktop POS
- `PosOrderScreen` is mobile-first: a floating button toggles between Menu and Cart on
  small screens; on desktop it shows menu + cart side by side.
- Kitchen board is horizontally scrollable columns and large touch targets.

## Automated Tests

### Backend (PHPUnit)
- `tests/Feature/OrderWorkflowTest.php` — valid transitions including `draft`→`confirmed`,
  `ready`→`served`→`completed`, 409 on invalid/no-op, duplicate-confirm idempotency,
  KOT sync, inventory deduction/reversal.
- `tests/Integration/OrderWorkflowIntegrationTest.php` — full lifecycle, reversal,
  totals/invoice consistency.
- `tests/Unit/OrderWorkflowServiceTest.php` — inventory service idempotency.

### Frontend (Vitest)
- `src/features/orders/__tests__/PosOrderScreen.test.tsx` — rendering, item
  selection, quantity changes, cart behavior, send-to-kitchen, table selector gating.
- `src/features/kitchen/__tests__/KanbanBoard.test.tsx` — columns, KOT cards, status
  advancement, detail open, empty states.
