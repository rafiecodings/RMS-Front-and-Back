<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Order;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Table;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Order::with(['customer', 'table', 'items.menuItem']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($orderType = $request->input('order_type')) {
            $query->where('order_type', $orderType);
        }

        if ($paymentStatus = $request->input('payment_status')) {
            $query->where('payment_status', $paymentStatus);
        }

        if ($date = $request->input('date')) {
            $query->whereDate('created_at', $date);
        }

        if ($search = $request->input('search')) {
            $query->where('order_number', 'ilike', "%{$search}%");
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
            'order_type' => 'required|string|in:dine_in,takeaway,delivery',
            'notes' => 'nullable|string|max:2000',
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => 'required|string|exists:menu_items,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.notes' => 'nullable|string|max:500',
            'items.*.modifier_ids' => 'sometimes|array',
            'items.*.modifier_ids.*' => 'string|exists:menu_modifiers,id',
        ]);

        $result = DB::transaction(function () use ($validated, $request) {
            $orderNumber = 'ORD-' . strtoupper(uniqid());

            $subtotal = 0;
            foreach ($validated['items'] as $item) {
                $itemTotal = $item['unit_price'] * $item['quantity'];
                $subtotal += $itemTotal;
            }

            $restaurantSettings = \App\Models\RestaurantSetting::first();
            $taxRate = $restaurantSettings?->default_tax_rate ?? 0;
            $taxAmount = $subtotal * ($taxRate / 100);
            $serviceCharge = $restaurantSettings?->service_charge_enabled
                ? $subtotal * (($restaurantSettings->default_service_charge ?? 0) / 100)
                : 0;
            $total = $subtotal + $taxAmount + $serviceCharge;

            $order = Order::create([
                'order_number' => $orderNumber,
                'customer_id' => $validated['customer_id'] ?? null,
                'table_id' => $validated['table_id'] ?? null,
                'order_type' => $validated['order_type'],
                'status' => 'pending',
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'discount_amount' => 0,
                'service_charge' => $serviceCharge,
                'total' => $total,
                'payment_status' => 'unpaid',
                'notes' => $validated['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            foreach ($validated['items'] as $itemData) {
                $itemTotal = $itemData['unit_price'] * $itemData['quantity'];

                $orderItem = OrderItem::create([
                    'order_id' => $order->id,
                    'menu_item_id' => $itemData['menu_item_id'],
                    'name' => $itemData['name'] ?? '',
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    'total_price' => $itemTotal,
                    'discount_amount' => 0,
                    'notes' => $itemData['notes'] ?? null,
                    'status' => 'pending',
                ]);

                if (!empty($itemData['modifier_ids'])) {
                    $orderItem->modifiers()->sync($itemData['modifier_ids']);
                }
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
                    'price' => (float) $m->price,
                ]),
            ]),
            'created_at' => $result->created_at?->toISOString(),
            'updated_at' => $result->updated_at?->toISOString(),
        ], 'Order created successfully.');
    }

    public function show(string $id): JsonResponse
    {
        $order = Order::with(['customer', 'table', 'items.menuItem', 'items.modifiers', 'statusHistory.changer'])
            ->find($id);

        if (!$order) {
            return $this->notFound('Order not found.');
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
                'quantity' => $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'total_amount' => (float) $item->total_price,
                'discount_amount' => (float) $item->discount_amount,
                'notes' => $item->notes,
                'status' => $item->status,
                'modifiers' => $item->modifiers->map(fn ($m) => [
                    'id' => $m->id,
                    'name' => $m->name,
                    'price' => (float) $m->price,
                ]),
            ]),
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

        $order->update(['status' => $validated['status']]);

        OrderStatusHistory::create([
            'order_id' => $order->id,
            'status' => $validated['status'],
            'notes' => $validated['notes'] ?? "Status changed to {$validated['status']}",
            'changed_by' => $request->user()->id,
        ]);

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

        if (!$order) {
            return $this->notFound('Order not found.');
        }

        if (in_array($order->status, ['completed', 'cancelled', 'voided'])) {
            return $this->error('Cannot add items to a ' . $order->status . ' order.', 409);
        }

        $validated = $request->validate([
            'menu_item_id' => 'required|string|exists:menu_items,id',
            'quantity' => 'required|integer|min:1',
            'unit_price' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:500',
            'modifier_ids' => 'sometimes|array',
            'modifier_ids.*' => 'string|exists:menu_modifiers,id',
        ]);

        $itemTotal = $validated['unit_price'] * $validated['quantity'];

        $orderItem = OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $validated['menu_item_id'],
            'quantity' => $validated['quantity'],
            'unit_price' => $validated['unit_price'],
            'total_price' => $itemTotal,
            'discount_amount' => 0,
            'notes' => $validated['notes'] ?? null,
            'status' => 'pending',
        ]);

        if (!empty($validated['modifier_ids'])) {
            $orderItem->modifiers()->sync($validated['modifier_ids']);
        }

        $newSubtotal = $order->subtotal + $itemTotal;
        $restaurantSettings = \App\Models\RestaurantSetting::first();
        $taxRate = $restaurantSettings?->default_tax_rate ?? 0;
        $taxAmount = $newSubtotal * ($taxRate / 100);
        $serviceCharge = $restaurantSettings?->service_charge_enabled
            ? $newSubtotal * (($restaurantSettings->default_service_charge ?? 0) / 100)
            : 0;

        $order->update([
            'subtotal' => $newSubtotal,
            'tax_amount' => $taxAmount,
            'service_charge' => $serviceCharge,
            'total' => $newSubtotal + $taxAmount + $serviceCharge - $order->discount_amount,
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
                'price' => (float) $m->price,
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
            'quantity' => 'sometimes|integer|min:1',
            'notes' => 'nullable|string|max:500',
            'modifier_ids' => 'sometimes|array',
            'modifier_ids.*' => 'string|exists:menu_modifiers,id',
        ]);

        $oldTotal = (float) $orderItem->total_price;

        if (isset($validated['quantity']) && $validated['quantity'] !== $orderItem->quantity) {
            $validated['total_price'] = (float) $orderItem->unit_price * $validated['quantity'];
        }

        $orderItem->update($validated);

        if (array_key_exists('modifier_ids', $validated)) {
            $orderItem->modifiers()->sync($validated['modifier_ids']);
        }

        $newTotal = (float) $orderItem->total_price;
        $subtotalDiff = $newTotal - $oldTotal;
        $newSubtotal = (float) $order->subtotal + $subtotalDiff;

        $restaurantSettings = \App\Models\RestaurantSetting::first();
        $taxRate = $restaurantSettings?->default_tax_rate ?? 0;
        $taxAmount = $newSubtotal * ($taxRate / 100);
        $serviceCharge = $restaurantSettings?->service_charge_enabled
            ? $newSubtotal * (($restaurantSettings->default_service_charge ?? 0) / 100)
            : 0;

        $order->update([
            'subtotal' => $newSubtotal,
            'tax_amount' => $taxAmount,
            'service_charge' => $serviceCharge,
            'total' => $newSubtotal + $taxAmount + $serviceCharge - $order->discount_amount,
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
                'price' => (float) $m->price,
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

        $newSubtotal = (float) $order->subtotal - $itemTotal;

        $restaurantSettings = \App\Models\RestaurantSetting::first();
        $taxRate = $restaurantSettings?->default_tax_rate ?? 0;
        $taxAmount = max(0, $newSubtotal * ($taxRate / 100));
        $serviceCharge = $restaurantSettings?->service_charge_enabled
            ? max(0, $newSubtotal * (($restaurantSettings->default_service_charge ?? 0) / 100))
            : 0;

        $order->update([
            'subtotal' => max(0, $newSubtotal),
            'tax_amount' => $taxAmount,
            'service_charge' => $serviceCharge,
            'total' => max(0, $newSubtotal + $taxAmount + $serviceCharge - $order->discount_amount),
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

            $restaurantSettings = \App\Models\RestaurantSetting::first();
            $taxRate = $restaurantSettings?->default_tax_rate ?? 0;
            $taxAmount = $newSubtotal * ($taxRate / 100);
            $serviceCharge = $restaurantSettings?->service_charge_enabled
                ? $newSubtotal * (($restaurantSettings->default_service_charge ?? 0) / 100)
                : 0;

            $newOrder = Order::create([
                'order_number' => 'ORD-' . strtoupper(uniqid()),
                'customer_id' => $order->customer_id,
                'table_id' => $validated['new_table_id'] ?? $order->table_id,
                'order_type' => $order->order_type,
                'status' => 'pending',
                'subtotal' => $newSubtotal,
                'tax_amount' => $taxAmount,
                'discount_amount' => 0,
                'service_charge' => $serviceCharge,
                'total' => $newSubtotal + $taxAmount + $serviceCharge,
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

            $remainingTaxAmount = $remainingSubtotal * ($taxRate / 100);
            $remainingServiceCharge = $restaurantSettings?->service_charge_enabled
                ? $remainingSubtotal * (($restaurantSettings->default_service_charge ?? 0) / 100)
                : 0;

            $order->update([
                'subtotal' => $remainingSubtotal,
                'tax_amount' => $remainingTaxAmount,
                'service_charge' => $remainingServiceCharge,
                'total' => $remainingSubtotal + $remainingTaxAmount + $remainingServiceCharge - $order->discount_amount,
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

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $order->update([
            'status' => 'voided',
            'cancellation_reason' => $validated['reason'],
        ]);

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

        $validated = $request->validate([
            'payment_method' => 'required|string|in:cash,card,bank_transfer,gift_card,loyalty_points,digital_wallet,room_charge',
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
            return $this->error('Invoice is already fully paid.', 409);
        }

        if ($validated['amount'] > (float) $invoice->balance) {
            return $this->error('Payment amount exceeds remaining balance.', 422);
        }

        $payment = \Illuminate\Support\Facades\DB::transaction(function () use ($validated, $invoice, $order, $request) {
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
