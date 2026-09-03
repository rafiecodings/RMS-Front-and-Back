<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Order;

use App\Http\Controllers\Controller;
use App\Models\Discount;
use App\Models\Invoice;
use App\Models\MenuItem;
use App\Models\Payment;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Table;
use App\Services\OrderWorkflowService;
use App\Services\PricingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    /**
     * Allowed order-status transitions. The UI only offers valid next steps;
     * the backend enforces the machine authoritatively with a readable 409.
     */
    private const TRANSITIONS = [
        'pending' => ['confirmed', 'cancelled'],
        'confirmed' => ['preparing', 'cancelled'],
        'preparing' => ['ready', 'cancelled'],
        'ready' => ['served'],
        // 'served' has no forward PATCH transitions: completion is a
        // settlement outcome reached ONLY via POST /orders/{id}/payments.
        'served' => [],
        // on_hold is managed exclusively by hold()/recall().
        'completed' => [],
        'cancelled' => [],
        'voided' => [],
    ];

    public function index(Request $request): JsonResponse
    {
        $query = Order::with(['customer', 'table', 'items.menuItem']);

        // Archived orders are hidden from the active list unless explicitly
        // requested with ?archived=1.
        if ($request->boolean('archived')) {
            $query->whereNotNull('archived_at');
        } else {
            $query->whereNull('archived_at');
        }

        if ($status = $request->input('status')) {
            $statuses = array_filter(array_map('trim', explode(',', $status)));
            $query->whereIn('status', $statuses);
        }

        if ($orderType = $request->input('order_type')) {
            $query->where('order_type', $orderType);
        }

        if ($paymentStatus = $request->input('payment_status')) {
            // Support comma lists, e.g. ?payment_status=unpaid,partial
            $statuses = array_filter(array_map('trim', explode(',', $paymentStatus)));
            $query->whereIn('payment_status', $statuses);
        }

        if ($date = $request->input('date')) {
            $query->whereDate('created_at', $date);
        }

        if ($search = $request->input('search')) {
            $query->whereRaw('LOWER(order_number) LIKE ?', ["%".strtolower($search)."%"]);
        }

        $orders = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $orders->getCollection()->map(fn (Order $o) => [
            'id' => $o->id,
            'order_number' => $o->order_number,
            'order_type' => $o->order_type,
            'status' => $o->status,
            'subtotal' => (float) $o->subtotal,
            'tax_amount' => (float) $o->tax_amount,
            'discount_amount' => (float) $o->discount_amount,
            'applied_discount' => $o->applied_discount_name ? [
                'id' => $o->discount_id,
                'name' => $o->applied_discount_name,
                'code' => $o->applied_discount_code,
                'type' => $o->applied_discount_type,
                'value' => (float) $o->applied_discount_value,
            ] : null,
            'service_charge' => (float) $o->service_charge,
            'total_amount' => (float) $o->total,
            'payment_status' => $o->payment_status,
            'payment_method' => $o->payment_method,
            'notes' => $o->notes,
            'customer_id' => $o->customer_id,
            'table_id' => $o->table_id,
            'customer' => $o->customer ? [
                'id' => $o->customer->id,
                'name' => $o->customer->name,
            ] : null,
            'customer_name' => $o->customer?->name,
            'table_number' => $o->table?->number,
            'table' => $o->table ? [
                'id' => $o->table->id,
                'number' => $o->table->number,
            ] : null,
            'items_count' => $o->items->count(),
            'placed_at' => $o->created_at?->toISOString(),
            'created_at' => $o->created_at?->toISOString(),
            'updated_at' => $o->updated_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'table_id' => 'nullable|exists:tables,id',
            'order_type' => 'required|string|in:dine_in,takeaway',
            'notes' => 'nullable|string|max:2000',
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => 'required|string|exists:menu_items,id',
            'items.*.quantity' => 'required|integer|min:1|max:9999',
            'items.*.unit_price' => 'nullable|numeric|min:0',
            'items.*.notes' => 'nullable|string|max:500',
            'items.*.modifier_ids' => 'sometimes|array',
            'items.*.modifier_ids.*' => 'string|exists:menu_modifiers,id',
            'discount_id' => 'nullable|string|exists:discounts,id',
            'discount_code' => 'nullable|string|max:50',
            'discount_verified' => 'nullable|boolean',
            'auto_apply_promotions' => 'nullable|boolean',
        ]);

        $pricing = app(PricingService::class);

        $menuItemIds = collect($validated['items'])->pluck('menu_item_id')->unique()->all();
        $menuItems = MenuItem::with('modifiers')
            ->whereIn('id', $menuItemIds)
            ->get()
            ->keyBy('id');

        $lineItems = [];
        $subtotal = 0.0;
        foreach ($validated['items'] as $itemData) {
            $menuItem = $menuItems->get($itemData['menu_item_id']);

            if (!$menuItem) {
                return $this->error('One or more menu items were not found.', 422);
            }

            $line = $pricing->buildLineItem(
                $menuItem,
                (int) $itemData['quantity'],
                $itemData['modifier_ids'] ?? [],
            );

            if ($line['error'] !== null) {
                return $this->error($line['error'], 422);
            }

            $lineItems[] = [
                'menu_item' => $menuItem,
                'data' => $itemData,
                'line' => $line,
            ];

            $subtotal += $line['total_price'];
        }

        if ($subtotal > 9999999999.99) {
            return $this->error('Order subtotal exceeds the maximum allowed amount.', 422);
        }

        // An explicit discount (by id or code) is honored as-is. Otherwise,
        // when the client opts in, the server selects the single best-eligible
        // active promotion (non-stacking) so pricing stays authoritative.
        $promoCustomer = !empty($validated['customer_id'])
            ? \App\Models\Customer::find($validated['customer_id'])
            : null;

        if (!empty($validated['discount_id']) || !empty($validated['discount_code'])) {
            $discountResolution = $pricing->resolveDiscount(
                $validated['discount_id'] ?? null,
                $validated['discount_code'] ?? null,
                $subtotal,
                $promoCustomer,
                (bool) ($validated['discount_verified'] ?? false),
            );
        } elseif (!empty($validated['auto_apply_promotions'])) {
            $discountResolution = $pricing->resolveBestPromotion($subtotal, $promoCustomer);
        } else {
            $discountResolution = ['discount' => null, 'amount' => 0.0, 'error' => null];
        }

        if ($discountResolution['error'] !== null) {
            return $this->error($discountResolution['error'], 422);
        }

        $totals = $pricing->orderTotals($subtotal, $discountResolution['amount']);

        $result = DB::transaction(function () use ($validated, $request, $lineItems, $discountResolution, $totals) {
            if (($validated['order_type'] ?? null) === 'dine_in' && !empty($validated['table_id'])) {
                $table = Table::lockForUpdate()->find($validated['table_id']);
                if (!$table || $table->status !== 'available') {
                    abort(409, 'Selected table is not available.');
                }
            }

            $orderNumber = 'ORD-' . strtoupper(uniqid());

            $order = Order::create([
                'order_number' => $orderNumber,
                'customer_id' => $validated['customer_id'] ?? null,
                'table_id' => $validated['table_id'] ?? null,
                'order_type' => $validated['order_type'],
                'status' => 'pending',
                'subtotal' => $totals['subtotal'],
                'tax_amount' => $totals['tax_amount'],
                'discount_amount' => $totals['discount_amount'],
                'discount_id' => $discountResolution['discount']?->id,
                'applied_discount_name' => $discountResolution['discount']?->name,
                'applied_discount_code' => $discountResolution['discount']?->code,
                'applied_discount_type' => $discountResolution['discount']?->type,
                'applied_discount_value' => $discountResolution['discount']?->value,
                'service_charge' => $totals['service_charge'],
                'total' => $totals['total'],
                'payment_status' => 'unpaid',
                'notes' => $validated['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            foreach ($lineItems as $entry) {
                $orderItem = OrderItem::create([
                    'order_id' => $order->id,
                    'menu_item_id' => $entry['menu_item']->id,
                    'name' => $entry['menu_item']->name,
                    'quantity' => $entry['data']['quantity'],
                    'unit_price' => $entry['line']['unit_price'],
                    'total_price' => $entry['line']['total_price'],
                    'discount_amount' => 0,
                    'notes' => $entry['data']['notes'] ?? null,
                    'status' => 'pending',
                ]);

                if ($entry['line']['modifier_snapshot'] !== []) {
                    $orderItem->modifiers()->sync($entry['line']['modifier_snapshot']);
                }
            }

            if ($discountResolution['discount']) {
                $discount = Discount::lockForUpdate()
                    ->where('id', $discountResolution['discount']->id)
                    ->where('is_active', true)
                    ->first();

                if (! $discount) {
                    throw ValidationException::withMessages([
                        'discount' => ['Discount is no longer available.'],
                    ]);
                }

                if ($discount->max_uses !== null && $discount->used_count >= (int) $discount->max_uses) {
                    throw ValidationException::withMessages([
                        'discount' => ['Discount usage limit reached.'],
                    ]);
                }

                $discount->increment('used_count');
            }

            if ($order->table_id) {
                Table::where('id', $order->table_id)
                    ->where('status', 'available')
                    ->update(['status' => 'occupied']);
            }

            OrderStatusHistory::create([
                'order_id' => $order->id,
                'status' => 'pending',
                'notes' => 'Order created',
                'changed_by' => $request->user()->id,
            ]);

            return $order;
        });

        $result->load(['customer', 'table', 'items.modifiers']);

        return $this->created([
            'id' => $result->id,
            'order_number' => $result->order_number,
            'order_type' => $result->order_type,
            'status' => $result->status,
            'subtotal' => (float) $result->subtotal,
            'tax_amount' => (float) $result->tax_amount,
            'discount_amount' => (float) $result->discount_amount,
            'applied_discount' => $result->applied_discount_name ? [
                'id' => $result->discount_id,
                'name' => $result->applied_discount_name,
                'code' => $result->applied_discount_code,
                'type' => $result->applied_discount_type,
                'value' => (float) $result->applied_discount_value,
            ] : null,
            'service_charge' => (float) $result->service_charge,
            'total_amount' => (float) $result->total,
            'payment_status' => $result->payment_status,
            'notes' => $result->notes,
            'customer' => $result->customer ? [
                'id' => $result->customer->id,
                'name' => $result->customer->name,
            ] : null,
            'table' => $result->table ? [
                'id' => $result->table->id,
                'number' => $result->table->number,
            ] : null,
            'items' => $result->items->map(fn (OrderItem $item) => [
                'id' => $item->id,
                'menu_item_id' => $item->menu_item_id,
                'name' => $item->name,
                'quantity' => $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'total_amount' => (float) $item->total_price,
                'notes' => $item->notes,
                'status' => $item->status,
                'modifiers' => $item->modifiers->map(fn ($m) => [
                    'id' => $m->id,
                    'name' => $m->name,
                    'price' => (float) ($m->pivot->price ?? $m->price),
                ]),
            ]),
            'created_at' => $result->created_at?->toISOString(),
            'updated_at' => $result->updated_at?->toISOString(),
        ], 'Order created successfully.');
    }

    public function show(string $id): JsonResponse
    {
        $order = Order::with(['customer', 'table', 'items.menuItem', 'items.modifiers', 'statusHistory.changer', 'invoice.payments'])
            ->find($id);

        if (!$order) {
            return $this->notFound('Order not found.');
        }

        return $this->success([
            'id' => $order->id,
            'invoice_id' => $order->invoice?->id,
            'order_number' => $order->order_number,
            'order_type' => $order->order_type,
            'status' => $order->status,
            'subtotal' => (float) $order->subtotal,
            'tax_amount' => (float) $order->tax_amount,
            'discount_amount' => (float) $order->discount_amount,
            'applied_discount' => $order->applied_discount_name ? [
                'id' => $order->discount_id,
                'name' => $order->applied_discount_name,
                'code' => $order->applied_discount_code,
                'type' => $order->applied_discount_type,
                'value' => (float) $order->applied_discount_value,
            ] : null,
            'service_charge' => (float) $order->service_charge,
            'total_amount' => (float) $order->total,
            'payment_status' => $order->payment_status,
            'payment_method' => $order->payment_method,
            'notes' => $order->notes,
            'cancellation_reason' => $order->cancellation_reason,
            'customer' => $order->customer ? [
                'id' => $order->customer->id,
                'name' => $order->customer->name,
                'phone' => $order->customer->phone,
            ] : null,
            // Flattened labels so consumers never fall back to showing the
            // raw customer/table UUID.
            'customer_name' => $order->customer?->name,
            'table_number' => $order->table?->number,
            'table' => $order->table ? [
                'id' => $order->table->id,
                'number' => $order->table->number,
            ] : null,
            'items' => $order->items->map(fn (OrderItem $item) => [
                'id' => $item->id,
                'menu_item_id' => $item->menu_item_id,
                'name' => $item->name,
                'quantity' => $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'total_amount' => (float) $item->total_price,
                'discount_amount' => (float) $item->discount_amount,
                'notes' => $item->notes,
                'status' => $item->status,
                'modifiers' => $item->modifiers->map(fn ($m) => [
                    'id' => $m->id,
                    'name' => $m->name,
                    'price' => (float) ($m->pivot->price ?? $m->price),
                ]),
            ]),
            'payments' => $order->invoice?->payments->map(fn ($p) => [
                'id' => $p->id,
                'amount' => (float) $p->amount,
                'payment_method' => $p->payment_method,
                'reference_number' => $p->reference_number,
                'created_at' => $p->created_at?->toISOString(),
            ]) ?? [],
            'created_at' => $order->created_at?->toISOString(),
            'updated_at' => $order->updated_at?->toISOString(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $order = Order::find($id);

        if (!$order) {
            return $this->notFound('Order not found.');
        }

        if (in_array($order->status, ['completed', 'cancelled', 'voided'])) {
            return $this->error('Cannot modify a ' . $order->status . ' order.', 409);
        }

        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'table_id' => 'nullable|exists:tables,id',
            'notes' => 'nullable|string|max:2000',
        ]);

        $order->update($validated);

        return $this->success([
            'id' => $order->id,
            'order_number' => $order->order_number,
            'status' => $order->status,
            'notes' => $order->notes,
            'updated_at' => $order->updated_at?->toISOString(),
        ], 'Order updated successfully.');
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $order = Order::find($id);

        if (!$order) {
            return $this->notFound('Order not found.');
        }

        $validated = $request->validate([
            'status' => 'required|string|in:pending,confirmed,preparing,ready,served,completed,cancelled',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Enforce the status machine — no arbitrary timeline jumping.
        $target = $validated['status'];
        $current = $order->status;

        if ($current !== $target) {
            // Completion is a settlement outcome. It may ONLY be reached
            // through a successful payment (POST /orders/{id}/payments),
            // never by a direct status patch — this prevents bypassing the
            // Kitchen → POS → Payment workflow.
            if ($target === 'completed') {
                return $this->error(
                    'Orders can only be marked completed after a successful payment. Settle the bill via the POS first.',
                    409
                );
            }

            // CRITICAL: an order can never be preparing/ready with an empty
            // kitchen. A KOT ticket must already exist (it is created at
            // confirmation) before the order may reflect any kitchen progress.
            // This keeps Order ↔ KOT ↔ Kitchen in lockstep: the kitchen board
            // always owns preparing/ready, never a blind direct patch.
            if (in_array($target, ['preparing', 'ready'], true)) {
                $kotExists = \App\Models\KotTicket::where('order_id', $order->id)
                    ->whereNotIn('status', ['voided'])
                    ->exists();

                if (! $kotExists) {
                    return $this->error(
                        "Cannot move this order to {$target} — no kitchen ticket exists. "
                        .'Send the order to the kitchen first.',
                        409
                    );
                }
            }

            $allowed = self::TRANSITIONS[$current] ?? [];
            if (! in_array($target, $allowed, true)) {
                return $this->error(
                    "This order can no longer be moved to {$target}. A {$current} order allows only: "
                    .( $allowed === [] ? 'no further changes (terminal).' : implode(', ', $allowed).'.'),
                    409
                );
            }
        }

        // Capture the pre-transition status: the loyalty visit hook must fire
        // exactly once, only on the transition INTO "completed".
        $previousStatus = $current;

        $order->update(['status' => $validated['status']]);

        OrderStatusHistory::create([
            'order_id' => $order->id,
            'status' => $validated['status'],
            'notes' => $validated['notes'] ?? "Status changed to {$validated['status']}",
            'changed_by' => $request->user()->id,
        ]);

        $workflow = app(OrderWorkflowService::class);

        if ($target === 'confirmed') {
            try {
                $workflow->confirmOrder($order, $request->user());
            } catch (\App\Exceptions\InsufficientStockException $e) {
                $order->update(['status' => $current]);
                \App\Models\OrderStatusHistory::where('order_id', $order->id)
                    ->where('status', 'confirmed')
                    ->orderByDesc('id')
                    ->limit(1)
                    ->delete();

                return $this->error(
                    'Cannot confirm order: insufficient stock for one or more ingredients.',
                    422,
                    ['insufficient' => $e->getInsufficient()]
                );
            }

            \App\Services\AuditLogger::record('order_confirmed', $order, [
                'description' => "Order {$order->order_number} confirmed — kitchen ticket generated",
            ]);
        }

        // Waiter served the table → close out any open kitchen tickets.
        if ($target === 'served') {
            \App\Models\KotTicket::where('order_id', $order->id)
                ->whereIn('status', ['received', 'pending', 'in_progress', 'ready'])
                ->update(['status' => 'completed', 'completed_at' => now()]);
            \App\Services\AuditLogger::record('order_served', $order, [
                'description' => "Order {$order->order_number} served",
            ]);
        }

        if ($target === 'cancelled') {
            \App\Services\AuditLogger::record('order_cancelled', $order, [
                'description' => "Order {$order->order_number} cancelled"
                    .($validated['notes'] ?? '' ? ": {$validated['notes']}" : '.'),
            ]);
        }

        if ($target === 'completed') {
            // Inventory is already consumed at confirmation; settlement must
            // not deduct again. Loyalty visit is recorded once on completion.
            if (
                $previousStatus !== 'completed'
                && $order->customer_id
                && $order->payment_status === 'paid'
            ) {
                $order->customer?->recordCompletedVisit((float) $order->total);
            }
        }

        if ($validated['status'] === 'cancelled') {
            $workflow->reverseInventoryForCancelledOrder($order, $request->user());
        }

        if (in_array($validated['status'], ['completed', 'cancelled']) && $order->table_id) {
            Table::where('id', $order->table_id)->update(['status' => 'available']);
        }

        return $this->success([
            'id' => $order->id,
            'order_number' => $order->order_number,
            'status' => $order->status,
        ], 'Order status updated successfully.');
    }

    /**
     * Archive an order (soft-hide from active lists; never deleted).
     * Only completed or cancelled orders may be archived.
     */
    public function archive(Request $request, string $id): JsonResponse
    {
        $order = Order::find($id);

        if (!$order) {
            return $this->notFound('Order not found.');
        }

        if (! in_array($order->status, ['completed', 'cancelled'], true)) {
            return $this->error(
                'Only completed or cancelled orders can be archived.',
                422
            );
        }

        // Idempotent: archiving an already-archived order is a no-op.
        if ($order->archived_at === null) {
            $order->update(['archived_at' => now()]);
        }

        return $this->success([
            'id' => $order->id,
            'order_number' => $order->order_number,
            'status' => $order->status,
            'archived_at' => $order->archived_at?->toISOString(),
        ], 'Order archived successfully.');
    }

    /**
     * Restore an archived order (sets archived_at back to null).
     */
    public function unarchive(Request $request, string $id): JsonResponse
    {
        $order = Order::find($id);

        if (!$order) {
            return $this->notFound('Order not found.');
        }

        $order->update(['archived_at' => null]);

        return $this->success([
            'id' => $order->id,
            'order_number' => $order->order_number,
            'status' => $order->status,
            'archived_at' => null,
        ], 'Order restored successfully.');
    }

    public function addItem(Request $request, string $id): JsonResponse
    {
        $order = Order::find($id);

        if (!$order) {
            return $this->notFound('Order not found.');
        }

        if (in_array($order->status, ['completed', 'cancelled', 'voided'])) {
            return $this->error('Cannot add items to a ' . $order->status . ' order.', 409);
        }

        $validated = $request->validate([
            'menu_item_id' => 'required|string|exists:menu_items,id',
            'quantity' => 'required|integer|min:1|max:9999',
            'unit_price' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:500',
            'modifier_ids' => 'sometimes|array',
            'modifier_ids.*' => 'string|exists:menu_modifiers,id',
        ]);

        $pricing = app(PricingService::class);

        $menuItem = MenuItem::with('modifiers')->find($validated['menu_item_id']);

        if (!$menuItem) {
            return $this->error('Menu item not found.', 422);
        }

        $line = $pricing->buildLineItem(
            $menuItem,
            (int) $validated['quantity'],
            $validated['modifier_ids'] ?? [],
        );

        if ($line['error'] !== null) {
            return $this->error($line['error'], 422);
        }

        $orderItem = OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $menuItem->id,
            'name' => $menuItem->name,
            'quantity' => $validated['quantity'],
            'unit_price' => $line['unit_price'],
            'total_price' => $line['total_price'],
            'discount_amount' => 0,
            'notes' => $validated['notes'] ?? null,
            'status' => 'pending',
        ]);

        if ($line['modifier_snapshot'] !== []) {
            $orderItem->modifiers()->sync($line['modifier_snapshot']);
        }

        $totals = $pricing->orderTotals(
            (float) $order->subtotal + $line['total_price'],
            (float) $order->discount_amount,
        );

        $order->update([
            'subtotal' => $totals['subtotal'],
            'tax_amount' => $totals['tax_amount'],
            'service_charge' => $totals['service_charge'],
            'total' => $totals['total'],
        ]);

        $orderItem->load('modifiers');

        return $this->created([
            'id' => $orderItem->id,
            'menu_item_id' => $orderItem->menu_item_id,
            'quantity' => $orderItem->quantity,
            'unit_price' => (float) $orderItem->unit_price,
            'total_price' => (float) $orderItem->total_price,
            'notes' => $orderItem->notes,
            'status' => $orderItem->status,
            'modifiers' => $orderItem->modifiers->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'price' => (float) ($m->pivot->price ?? $m->price),
            ]),
            'order' => [
                'subtotal' => (float) $order->subtotal,
                'tax_amount' => (float) $order->tax_amount,
                'service_charge' => (float) $order->service_charge,
                'total' => (float) $order->total,
            ],
        ], 'Item added to order.');
    }

    public function updateItem(Request $request, string $id, string $itemId): JsonResponse
    {
        $order = Order::find($id);

        if (!$order) {
            return $this->notFound('Order not found.');
        }

        $orderItem = OrderItem::where('order_id', $id)->where('id', $itemId)->first();

        if (!$orderItem) {
            return $this->notFound('Order item not found.');
        }

        $validated = $request->validate([
            'quantity' => 'sometimes|integer|min:1|max:9999',
            'notes' => 'nullable|string|max:500',
            'modifier_ids' => 'sometimes|array',
            'modifier_ids.*' => 'string|exists:menu_modifiers,id',
        ]);

        $pricing = app(PricingService::class);

        $oldTotal = (float) $orderItem->total_price;

        $modifierChanged = array_key_exists('modifier_ids', $validated);

        $update = [];
        if (isset($validated['quantity'])) {
            $update['quantity'] = $validated['quantity'];
        }
        if (array_key_exists('notes', $validated)) {
            $update['notes'] = $validated['notes'];
        }

        if ($modifierChanged) {
            $menuItem = MenuItem::with('modifiers')->find($orderItem->menu_item_id);

            if (!$menuItem) {
                return $this->error('Menu item not found.', 422);
            }

            $line = $pricing->buildLineItem(
                $menuItem,
                (int) ($validated['quantity'] ?? $orderItem->quantity),
                $validated['modifier_ids'] ?? [],
            );

            if ($line['error'] !== null) {
                return $this->error($line['error'], 422);
            }

            $update['unit_price'] = $line['unit_price'];
            $update['total_price'] = $line['total_price'];

            $orderItem->modifiers()->sync($line['modifier_snapshot']);
        } elseif (isset($validated['quantity']) && (int) $validated['quantity'] !== (int) $orderItem->quantity) {
            $update['total_price'] = round((float) $orderItem->unit_price * (int) $validated['quantity'], 2);
        }

        $orderItem->update($update);

        $newTotal = (float) $orderItem->total_price;
        $subtotalDiff = $newTotal - $oldTotal;
        $newSubtotal = max(0.0, (float) $order->subtotal + $subtotalDiff);

        $totals = $pricing->orderTotals($newSubtotal, (float) $order->discount_amount);

        $order->update([
            'subtotal' => $totals['subtotal'],
            'tax_amount' => $totals['tax_amount'],
            'service_charge' => $totals['service_charge'],
            'total' => $totals['total'],
        ]);

        $orderItem->load('modifiers');

        return $this->success([
            'id' => $orderItem->id,
            'quantity' => $orderItem->quantity,
            'total_price' => (float) $orderItem->total_price,
            'notes' => $orderItem->notes,
            'status' => $orderItem->status,
            'modifiers' => $orderItem->modifiers->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'price' => (float) ($m->pivot->price ?? $m->price),
            ]),
            'order' => [
                'subtotal' => (float) $order->subtotal,
                'tax_amount' => (float) $order->tax_amount,
                'service_charge' => (float) $order->service_charge,
                'total' => (float) $order->total,
            ],
        ], 'Order item updated.');
    }

    public function removeItem(string $id, string $itemId): JsonResponse
    {
        $order = Order::find($id);

        if (!$order) {
            return $this->notFound('Order not found.');
        }

        $orderItem = OrderItem::where('order_id', $id)->where('id', $itemId)->first();

        if (!$orderItem) {
            return $this->notFound('Order item not found.');
        }

        $itemTotal = (float) $orderItem->total_price;

        $orderItem->modifiers()->detach();
        $orderItem->delete();

        $newSubtotal = max(0.0, (float) $order->subtotal - $itemTotal);

        $totals = app(PricingService::class)->orderTotals($newSubtotal, (float) $order->discount_amount);

        $order->update([
            'subtotal' => $totals['subtotal'],
            'tax_amount' => $totals['tax_amount'],
            'service_charge' => $totals['service_charge'],
            'total' => $totals['total'],
        ]);

        return $this->success([
            'order' => [
                'subtotal' => (float) $order->subtotal,
                'tax_amount' => (float) $order->tax_amount,
                'service_charge' => (float) $order->service_charge,
                'total' => (float) $order->total,
            ],
        ], 'Item removed from order.');
    }

    public function hold(Request $request, string $id): JsonResponse
    {
        $order = Order::find($id);

        if (!$order) {
            return $this->notFound('Order not found.');
        }

        if ($order->status !== 'pending' && $order->status !== 'confirmed') {
            return $this->error('Only pending or confirmed orders can be held.', 409);
        }

        $order->update(['status' => 'on_hold']);

        OrderStatusHistory::create([
            'order_id' => $order->id,
            'status' => 'on_hold',
            'notes' => 'Order placed on hold',
            'changed_by' => $request->user()->id,
        ]);

        return $this->success([
            'id' => $order->id,
            'status' => $order->status,
        ], 'Order placed on hold.');
    }

    public function recall(Request $request, string $id): JsonResponse
    {
        $order = Order::find($id);

        if (!$order) {
            return $this->notFound('Order not found.');
        }

        if ($order->status !== 'on_hold') {
            return $this->error('Only held orders can be recalled.', 409);
        }

        $order->update(['status' => 'pending']);

        OrderStatusHistory::create([
            'order_id' => $order->id,
            'status' => 'pending',
            'notes' => 'Order recalled from hold',
            'changed_by' => $request->user()->id,
        ]);

        return $this->success([
            'id' => $order->id,
            'status' => $order->status,
        ], 'Order recalled successfully.');
    }

    public function split(Request $request, string $id): JsonResponse
    {
        $order = Order::find($id);

        if (!$order) {
            return $this->notFound('Order not found.');
        }

        $validated = $request->validate([
            'item_ids' => 'required|array|min:1',
            'item_ids.*' => 'string|exists:order_items,id',
            'new_table_id' => 'nullable|exists:tables,id',
        ]);

        $newOrder = DB::transaction(function () use ($order, $validated, $request) {
            $items = OrderItem::whereIn('id', $validated['item_ids'])
                ->where('order_id', $order->id)
                ->get();

            if ($items->isEmpty()) {
                return null;
            }

            $newSubtotal = 0;
            foreach ($items as $item) {
                $newSubtotal += (float) $item->total_price;
            }

            $pricing = app(PricingService::class);

            $newTotals = $pricing->orderTotals($newSubtotal, 0.0);

            $newOrder = Order::create([
                'order_number' => 'ORD-' . strtoupper(uniqid()),
                'customer_id' => $order->customer_id,
                'table_id' => $validated['new_table_id'] ?? $order->table_id,
                'order_type' => $order->order_type,
                'status' => 'pending',
                'subtotal' => $newTotals['subtotal'],
                'tax_amount' => $newTotals['tax_amount'],
                'discount_amount' => 0,
                'service_charge' => $newTotals['service_charge'],
                'total' => $newTotals['total'],
                'payment_status' => 'unpaid',
                'created_by' => $request->user()->id,
            ]);

            foreach ($items as $item) {
                $item->update(['order_id' => $newOrder->id]);
            }

            $remainingSubtotal = 0;
            $order->items()->each(function ($item) use (&$remainingSubtotal) {
                $remainingSubtotal += (float) $item->total_price;
            });

            $remainingTotals = $pricing->orderTotals($remainingSubtotal, (float) $order->discount_amount);

            $order->update([
                'subtotal' => $remainingTotals['subtotal'],
                'tax_amount' => $remainingTotals['tax_amount'],
                'service_charge' => $remainingTotals['service_charge'],
                'total' => $remainingTotals['total'],
            ]);

            return $newOrder;
        });

        if (!$newOrder) {
            return $this->error('Invalid item IDs for splitting.', 422);
        }

        return $this->success([
            'original_order' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'total' => (float) $order->total,
            ],
            'new_order' => [
                'id' => $newOrder->id,
                'order_number' => $newOrder->order_number,
                'total' => (float) $newOrder->total,
            ],
        ], 'Order split successfully.');
    }

    public function void(Request $request, string $id): JsonResponse
    {
        $order = Order::find($id);

        if (!$order) {
            return $this->notFound('Order not found.');
        }

        if (in_array($order->status, ['completed', 'voided'])) {
            return $this->error('Cannot void a ' . $order->status . ' order.', 409);
        }

        if ($order->payment_status === 'paid') {
            return $this->error('Cannot void an order that is fully paid. Process a refund instead.', 409);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $order->update([
            'status' => 'voided',
            'cancellation_reason' => $validated['reason'],
        ]);

        app(OrderWorkflowService::class)->reverseInventoryForCancelledOrder($order, $request->user());

        if ($order->table_id) {
            Table::where('id', $order->table_id)->update(['status' => 'available']);
        }

        OrderStatusHistory::create([
            'order_id' => $order->id,
            'status' => 'voided',
            'notes' => "Order voided: {$validated['reason']}",
            'changed_by' => $request->user()->id,
        ]);

        return $this->success([
            'id' => $order->id,
            'status' => $order->status,
        ], 'Order voided successfully.');
    }

    public function pay(Request $request, string $id): JsonResponse
    {
        $order = Order::find($id);

        if (!$order) {
            return $this->notFound('Order not found.');
        }

        if (in_array($order->status, ['voided', 'cancelled'])) {
            return $this->error('Cannot process payment for a ' . $order->status . ' order.', 409);
        }

        if ($order->status !== 'served') {
            return $this->error(
                'Only served orders can be paid. Complete the kitchen and serving workflow first.',
                409
            );
        }

        // Final capstone payment methods. Loyalty TIER is not a tender type;
        // gift cards / room charges are hotel scope and removed.
        $validated = $request->validate([
            'payment_method' => 'required|string|in:cash,card,e_wallet',
            'amount' => 'required|numeric|min:0.01',
            'reference' => 'nullable|string|max:255',
        ]);

        $invoice = Invoice::where('order_id', $order->id)->first();

        if (!$invoice) {
            $invoice = Invoice::create([
                'invoice_number' => 'INV-' . strtoupper(uniqid()),
                'order_id' => $order->id,
                'subtotal' => $order->subtotal,
                'tax_amount' => $order->tax_amount,
                'discount_amount' => $order->discount_amount,
                'service_charge' => $order->service_charge,
                'total' => $order->total,
                'amount_paid' => 0,
                'balance' => $order->total,
                'status' => 'pending',
            ]);
        }

        if ($invoice->status === 'paid') {
            return $this->error('This order is already fully paid.', 409);
        }

        $balanceDue = round((float) $invoice->balance, 2);
        $tendered = round((float) $validated['amount'], 2);

        // One order → one payment → one method (split payment deferred).
        if ($tendered < $balanceDue - 0.001) {
            if ($validated['payment_method'] === 'cash') {
                return $this->error(
                    'Insufficient amount received. Cash received must cover the ₱'
                    . number_format($balanceDue, 2) . ' bill total.',
                    422
                );
            }
            return $this->error(
                'Card / e-wallet payments must be for the exact bill total of ₱'
                . number_format($balanceDue, 2) . '.',
                422
            );
        }

        $previousStatus = $order->status;
        $change = 0.0;

        $payment = \Illuminate\Support\Facades\DB::transaction(function () use ($validated, $invoice, $order, $request, $tendered, $balanceDue, $previousStatus, &$change) {
            // Cash records the amount RECEIVED; change is returned to guest.
            $recordedAmount = $validated['payment_method'] === 'cash'
                ? $tendered
                : $balanceDue;

            $payment = Payment::create([
                'invoice_id' => $invoice->id,
                'amount' => $recordedAmount,
                'payment_method' => $validated['payment_method'],
                'reference_number' => $validated['reference'] ?? null,
                'processed_by' => $request->user()->id,
            ]);

            if ($validated['payment_method'] === 'cash') {
                $change = round($tendered - $balanceDue, 2);
            }

            $newAmountPaid = (float) $invoice->amount_paid + $balanceDue;
            $invoice->update([
                'amount_paid' => $newAmountPaid,
                'balance' => 0.0,
                'status' => 'paid',
            ]);

            $order->update([
                'payment_status' => 'paid',
                'payment_method' => $validated['payment_method'],
            ]);

            // Atomic settlement side effects: complete the session exactly
            // once, free the table, log history. Loyalty visit is recorded
            // after commit (below) so retries can never double-count — a
            // retried request exits earlier at "already fully paid".
            if (! in_array($order->status, ['completed'], true)) {
                $order->update(['status' => 'completed']);

                OrderStatusHistory::create([
                    'order_id' => $order->id,
                    'status' => 'completed',
                    'notes' => 'Completed automatically on full payment ('.$validated['payment_method'].').',
                    'changed_by' => $request->user()->id,
                ]);
            }

            if ($order->table_id) {
                Table::where('id', $order->table_id)->update(['status' => 'available']);
            }

            return $payment;
        });

        // Post-commit side effects (each internally idempotent).
        // Inventory was already consumed at confirmation; payment must never
        // deduct recipe ingredients again.
        if ($order->customer_id && $previousStatus !== 'completed') {
            $freshCustomer = $order->customer()->first();
            $freshCustomer?->recordCompletedVisit((float) $order->total);
        }

        \App\Services\AuditLogger::record('payment_completed', $order, [
            'description' => sprintf(
                'Processed %s payment of ₱%s for %s%s',
                str_replace('_', ' ', $validated['payment_method']),
                number_format($balanceDue, 2),
                $order->order_number,
                $change > 0 ? ' — change ₱'.number_format($change, 2) : ''
            ),
            'method' => $validated['payment_method'],
            'amount' => $balanceDue,
            'change' => $change,
        ]);

        return $this->created([
            'id' => $payment->id,
            'amount' => (float) $payment->amount,
            'payment_method' => $payment->payment_method,
            'reference_number' => $payment->reference_number,
            'change' => $change,
            'order' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'payment_status' => $order->payment_status,
                'status' => $order->status,
            ],
            'invoice' => [
                'id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'amount_paid' => (float) $invoice->amount_paid,
                'balance' => (float) $invoice->balance,
                'status' => $invoice->status,
            ],
            'created_at' => $payment->created_at?->toISOString(),
        ], 'Payment processed successfully.');
    }

    public function timeline(string $id): JsonResponse
    {
        $order = Order::find($id);

        if (!$order) {
            return $this->notFound('Order not found.');
        }

        $history = OrderStatusHistory::with('changer')
            ->where('order_id', $id)
            ->orderBy('created_at', 'asc')
            ->get();

        $data = $history->map(fn (OrderStatusHistory $h) => [
            'id' => $h->id,
            'status' => $h->status,
            'notes' => $h->notes,
            'changed_by' => $h->changer ? [
                'id' => $h->changer->id,
                'name' => $h->changer->name,
            ] : null,
            'created_at' => $h->created_at?->toISOString(),
        ]);

        return $this->success(['items' => $data]);
    }

    public function reorder(Request $request, string $id): JsonResponse
    {
        $originalOrder = Order::with(['items.menuItem', 'items.modifiers'])->find($id);

        if (!$originalOrder) {
            return $this->notFound('Order not found.');
        }

        $newOrderData = [
            'customer_id' => $originalOrder->customer_id,
            'table_id' => $originalOrder->table_id,
            'order_type' => $originalOrder->order_type,
            'items' => $originalOrder->items->map(fn (OrderItem $item) => [
                'menu_item_id' => $item->menu_item_id,
                'quantity' => $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'notes' => $item->notes,
                'modifier_ids' => $item->modifiers->pluck('id')->toArray(),
            ])->toArray(),
        ];

        $request->merge([
            'customer_id' => $newOrderData['customer_id'],
            'table_id' => $newOrderData['table_id'],
            'order_type' => $newOrderData['order_type'],
            'items' => $newOrderData['items'],
        ]);

        return $this->store($request);
    }
}
