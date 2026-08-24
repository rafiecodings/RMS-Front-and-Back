<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Order;

use App\Http\Controllers\Controller;
use App\Models\Discount;
use App\Models\Invoice;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Payment;
use App\Models\Table;
use App\Services\OrderWorkflowService;
use App\Services\PricingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Order::with(['customer', 'table', 'items.menuItem']);

        if ($request->boolean('archived')) {
            $query->archived();
        } else {
            $query->notArchived();
        }

        if ($status = $request->input('status')) {
            $query->whereIn('status', explode(',', $status));
        }

        if ($orderType = $request->input('order_type')) {
            $query->where('order_type', $orderType);
        }

        if ($paymentStatus = $request->input('payment_status')) {
            $query->whereIn('payment_status', explode(',', $paymentStatus));
        }

        if ($date = $request->input('date')) {
            $query->whereDate('created_at', $date);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'ilike', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('name', 'ilike', "%{$search}%");
                    });
            });
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
            'service_charge' => (float) $o->service_charge,
            'total_amount' => (float) $o->total,
            'payment_status' => $o->payment_status,
            'payment_method' => $o->payment_method,
            'notes' => $o->notes,
            'placed_at' => $o->created_at?->toISOString(),
            'customer' => $o->customer ? [
                'id' => $o->customer->id,
                'name' => $o->customer->name,
            ] : null,
            'table' => $o->table ? [
                'id' => $o->table->id,
                'number' => $o->table->number,
            ] : null,
            'items_count' => $o->items->count(),
            'created_at' => $o->created_at?->toISOString(),
            'updated_at' => $o->updated_at?->toISOString(),
            'archived_at' => $o->archived_at?->toISOString(),
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
            'customer_id' => 'nullable|uuid|exists:customers,id',
            'table_id' => 'nullable|uuid|exists:tables,id',
            'order_type' => 'required|string|in:dine_in,takeaway,delivery',
            'notes' => 'nullable|string|max:2000',
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => 'required|uuid|exists:menu_items,id',
            'items.*.quantity' => 'required|integer|min:1|max:9999',
            'items.*.unit_price' => 'nullable|numeric|min:0',
            'items.*.notes' => 'nullable|string|max:500',
            'items.*.modifier_ids' => 'sometimes|array',
            'items.*.modifier_ids.*' => 'uuid|exists:menu_modifiers,id',
            'discount_id' => 'nullable|uuid|exists:discounts,id',
            'discount_code' => 'nullable|string|max:50',
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

            if (! $menuItem) {
                return $this->error('One or more menu items were not found.', 422);
            }

            if (! $menuItem->is_available) {
                return $this->error("Menu item '{$menuItem->name}' is not available for ordering.", 422);
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

        $discountResolution = $pricing->resolveDiscount(
            $validated['discount_id'] ?? null,
            $validated['discount_code'] ?? null,
            $subtotal,
        );

        if ($discountResolution['error'] !== null) {
            return $this->error($discountResolution['error'], 422);
        }

        $totals = $pricing->orderTotals($subtotal, $discountResolution['amount']);

        $result = DB::transaction(function () use ($validated, $request, $lineItems, $discountResolution, $totals) {
            $orderNumber = 'ORD-'.strtoupper(uniqid());

            $order = Order::create([
                'order_number' => $orderNumber,
                'customer_id' => $validated['customer_id'] ?? null,
                'table_id' => $validated['table_id'] ?? null,
                'order_type' => $validated['order_type'],
                'status' => Order::STATUS_DRAFT,
                'subtotal' => $totals['subtotal'],
                'tax_amount' => $totals['tax_amount'],
                'discount_amount' => $totals['discount_amount'],
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
                $discount = $discountResolution['discount'];

                $claim = Discount::where('id', $discount->id)->where('is_active', true);

                if ($discount->max_uses !== null) {
                    $claim->where('used_count', '<', (int) $discount->max_uses);
                }

                if (! $claim->increment('used_count')) {
                    throw ValidationException::withMessages([
                        'discount' => ['Discount usage limit reached.'],
                    ]);
                }
            }

            if ($order->table_id) {
                Table::where('id', $order->table_id)
                    ->where('status', 'available')
                    ->update(['status' => 'occupied']);
            }

            OrderStatusHistory::create([
                'order_id' => $order->id,
                'status' => Order::STATUS_DRAFT,
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

        if (! $order) {
            return $this->notFound('Order not found.');
        }

        // Derive lifecycle timestamps (placed_at, confirmed_at, …) from the
        // status history so the frontend timeline/placed column has real data.
        $statusAt = $order->statusHistory()
            ->orderBy('created_at')
            ->get()
            ->groupBy('status')
            ->map(fn ($group) => $group->first()->created_at?->toISOString())
            ->toArray();

        $lifecycle = [];
        foreach (['confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'] as $s) {
            $lifecycle["{$s}_at"] = $statusAt[$s] ?? null;
        }

        return $this->success([
            'id' => $order->id,
            'order_number' => $order->order_number,
            'order_type' => $order->order_type,
            'status' => $order->status,
            'subtotal' => (float) $order->subtotal,
            'tax_amount' => (float) $order->tax_amount,
            'discount_amount' => (float) $order->discount_amount,
            'service_charge' => (float) $order->service_charge,
            'total_amount' => (float) $order->total,
            'payment_status' => $order->payment_status,
            'payment_method' => $order->payment_method,
            'notes' => $order->notes,
            'cancellation_reason' => $order->cancellation_reason,
            'placed_at' => $order->created_at?->toISOString(),
            ...$lifecycle,
            'customer' => $order->customer ? [
                'id' => $order->customer->id,
                'name' => $order->customer->name,
                'phone' => $order->customer->phone,
            ] : null,
            'table' => $order->table ? [
                'id' => $order->table->id,
                'number' => $order->table->number,
            ] : null,
            'items' => $order->items->map(fn (OrderItem $item) => [
                'id' => $item->id,
                'menu_item_id' => $item->menu_item_id,
                'name' => $item->name,
                // Alias kept in sync with the frontend OrderItem type.
                'menu_item_name' => $item->name,
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
            'archived_at' => $order->archived_at?->toISOString(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $order = Order::find($id);

        if (! $order) {
            return $this->notFound('Order not found.');
        }

        if (in_array($order->status, ['completed', 'cancelled'])) {
            return $this->error('Cannot modify a '.$order->status.' order.', 409);
        }

        $validated = $request->validate([
            'customer_id' => 'nullable|uuid|exists:customers,id',
            'table_id' => 'nullable|uuid|exists:tables,id',
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

    public function archive(string $id): JsonResponse
    {
        $order = Order::find($id);

        if (! $order) {
            return $this->notFound('Order not found.');
        }

        if (! in_array($order->status, [
            Order::STATUS_COMPLETED,
            Order::STATUS_CANCELLED,
        ])) {
            return $this->error(
                'Only completed or cancelled orders can be archived.',
                422
            );
        }

        if ($order->archived_at) {
            return $this->success(
                $this->formatArchive($order),
                'Order is already archived.'
            );
        }

        $order->update(['archived_at' => now()]);

        return $this->success(
            $this->formatArchive($order),
            'Order archived successfully.'
        );
    }

    protected function formatArchive(Order $order): array
    {
        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'status' => $order->status,
            'archived_at' => $order->archived_at?->toISOString(),
            'updated_at' => $order->updated_at?->toISOString(),
        ];
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $order = Order::find($id);

        if (! $order) {
            return $this->notFound('Order not found.');
        }

        $validated = $request->validate([
            'status' => 'required|string|in:draft,pending,confirmed,preparing,ready,served,completed,cancelled',
            'notes' => 'nullable|string|max:1000',
        ]);

        if (! $order->canTransitionTo($validated['status'])) {
            return $this->error(
                "Invalid status transition from {$order->status} to {$validated['status']}.",
                409
            );
        }

        $order->update(['status' => $validated['status']]);

        OrderStatusHistory::create([
            'order_id' => $order->id,
            'status' => $validated['status'],
            'notes' => $validated['notes'] ?? "Status changed to {$validated['status']}",
            'changed_by' => $request->user()->id,
        ]);

        $workflow = app(OrderWorkflowService::class);

        if ($validated['status'] === 'confirmed') {
            $workflow->createKotForOrder($order);

            // Auto-advance: confirmation sends the order straight to the kitchen
            $order->update(['status' => 'preparing']);
            OrderStatusHistory::create([
                'order_id' => $order->id,
                'status' => 'preparing',
                'notes' => 'Order confirmed and sent to kitchen',
                'changed_by' => $request->user()->id,
            ]);
        }

        if ($validated['status'] === 'completed') {
            $workflow->deductInventoryForCompletedOrder($order, $request->user());
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

    public function addItem(Request $request, string $id): JsonResponse
    {
        $order = Order::find($id);

        if (! $order) {
            return $this->notFound('Order not found.');
        }

        if (in_array($order->status, ['completed', 'cancelled'])) {
            return $this->error('Cannot add items to a '.$order->status.' order.', 409);
        }

        $validated = $request->validate([
            'menu_item_id' => 'required|uuid|exists:menu_items,id',
            'quantity' => 'required|integer|min:1|max:9999',
            'unit_price' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:500',
            'modifier_ids' => 'sometimes|array',
            'modifier_ids.*' => 'uuid|exists:menu_modifiers,id',
        ]);

        $pricing = app(PricingService::class);

        $menuItem = MenuItem::with('modifiers')->find($validated['menu_item_id']);

        if (! $menuItem) {
            return $this->error('Menu item not found.', 422);
        }

        if (! $menuItem->is_available) {
            return $this->error("Menu item '{$menuItem->name}' is not available for ordering.", 422);
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

        if (! $order) {
            return $this->notFound('Order not found.');
        }

        $orderItem = OrderItem::where('order_id', $id)->where('id', $itemId)->first();

        if (! $orderItem) {
            return $this->notFound('Order item not found.');
        }

        $validated = $request->validate([
            'quantity' => 'sometimes|integer|min:1|max:9999',
            'notes' => 'nullable|string|max:500',
            'modifier_ids' => 'sometimes|array',
            'modifier_ids.*' => 'uuid|exists:menu_modifiers,id',
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

            if (! $menuItem) {
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

        if (! $order) {
            return $this->notFound('Order not found.');
        }

        $orderItem = OrderItem::where('order_id', $id)->where('id', $itemId)->first();

        if (! $orderItem) {
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

    public function pay(Request $request, string $id): JsonResponse
    {
        $order = Order::find($id);

        if (! $order) {
            return $this->notFound('Order not found.');
        }

        if (in_array($order->status, ['cancelled'])) {
            return $this->error('Cannot process payment for a '.$order->status.' order.', 409);
        }

        $validated = $request->validate([
            'payment_method' => 'required|string|in:cash,card,bank_transfer,gift_card,loyalty_points,digital_wallet,room_charge',
            'amount' => 'required|numeric|min:0.01',
            'reference' => 'nullable|string|max:255',
        ]);

        $invoice = Invoice::where('order_id', $order->id)->first();

        if (! $invoice) {
            $invoice = Invoice::create([
                'invoice_number' => 'INV-'.strtoupper(uniqid()),
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
            return $this->error('Invoice is already fully paid.', 409);
        }

        if ($validated['amount'] > (float) $invoice->balance) {
            return $this->error('Payment amount exceeds remaining balance.', 422);
        }

        $payment = DB::transaction(function () use ($validated, $invoice, $order, $request) {
            $payment = Payment::create([
                'invoice_id' => $invoice->id,
                'amount' => $validated['amount'],
                'payment_method' => $validated['payment_method'],
                'reference_number' => $validated['reference'] ?? null,
                'processed_by' => $request->user()->id,
            ]);

            $newAmountPaid = (float) $invoice->amount_paid + $validated['amount'];
            $newBalance = (float) $invoice->total - $newAmountPaid;

            $invoice->update([
                'amount_paid' => $newAmountPaid,
                'balance' => max(0, $newBalance),
                'status' => $newBalance <= 0 ? 'paid' : 'partial',
            ]);

            if ($newBalance <= 0) {
                $order->update([
                    'payment_status' => 'paid',
                    'payment_method' => $validated['payment_method'],
                ]);
            } else {
                $order->update([
                    'payment_status' => 'partial',
                    'payment_method' => $validated['payment_method'],
                ]);
            }

            return $payment;
        });

        return $this->created([
            'id' => $payment->id,
            'amount' => (float) $payment->amount,
            'payment_method' => $payment->payment_method,
            'reference_number' => $payment->reference_number,
            'order' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'payment_status' => $order->payment_status,
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

        if (! $order) {
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

        if (! $originalOrder) {
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
