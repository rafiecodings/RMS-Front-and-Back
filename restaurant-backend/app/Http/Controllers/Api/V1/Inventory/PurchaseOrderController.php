<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Ingredient;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PurchaseOrder::with(['supplier', 'items.ingredient']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($supplierId = $request->input('supplier_id')) {
            $query->where('supplier_id', $supplierId);
        }

        if ($search = $request->input('search')) {
            $query->where('po_number', 'ilike', "%{$search}%");
        }

        $purchaseOrders = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $purchaseOrders->getCollection()->map(fn (PurchaseOrder $po) => [
            'id' => $po->id,
            'po_number' => $po->po_number,
            'total_amount' => (float) $po->total_amount,
            'status' => $po->status,
            'notes' => $po->notes,
            'expected_date' => $po->expected_date?->toDateString(),
            'received_at' => $po->received_at?->toISOString(),
            'supplier' => $po->supplier ? [
                'id' => $po->supplier->id,
                'name' => $po->supplier->name,
            ] : null,
            'items_count' => $po->items->count(),
            'created_at' => $po->created_at?->toISOString(),
            'updated_at' => $po->updated_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $purchaseOrders->currentPage(),
                'last_page' => $purchaseOrders->lastPage(),
                'per_page' => $purchaseOrders->perPage(),
                'total' => $purchaseOrders->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'notes' => 'nullable|string|max:2000',
            'expected_date' => 'nullable|date|after:now',
            'items' => 'required|array|min:1',
            'items.*.ingredient_id' => 'required|string|exists:ingredients,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_cost' => 'required|numeric|min:0',
        ]);

        $itemsData = $validated['items'];
        unset($validated['items']);

        $totalAmount = array_sum(array_map(fn ($item) => $item['quantity'] * $item['unit_cost'], $itemsData));

        $result = DB::transaction(function () use ($validated, $itemsData, $totalAmount, $request) {
            $po = PurchaseOrder::create([
                ...$validated,
                'po_number' => 'PO-' . strtoupper(uniqid()),
                'total_amount' => $totalAmount,
                'status' => 'pending',
                'created_by' => $request->user()->id,
            ]);

            foreach ($itemsData as $itemData) {
                PurchaseOrderItem::create([
                    'purchase_order_id' => $po->id,
                    'ingredient_id' => $itemData['ingredient_id'],
                    'quantity' => $itemData['quantity'],
                    'unit_cost' => $itemData['unit_cost'],
                    'total_cost' => $itemData['quantity'] * $itemData['unit_cost'],
                ]);
            }

            return $po;
        });

        $result->load(['supplier', 'items.ingredient']);

        return $this->created([
            'id' => $result->id,
            'po_number' => $result->po_number,
            'total_amount' => (float) $result->total_amount,
            'status' => $result->status,
            'notes' => $result->notes,
            'expected_date' => $result->expected_date?->toDateString(),
            'supplier' => $result->supplier ? [
                'id' => $result->supplier->id,
                'name' => $result->supplier->name,
            ] : null,
            'items' => $result->items->map(fn (PurchaseOrderItem $item) => [
                'id' => $item->id,
                'ingredient_id' => $item->ingredient_id,
                'ingredient_name' => $item->ingredient?->name,
                'quantity' => (float) $item->quantity,
                'unit_cost' => (float) $item->unit_cost,
                'total_cost' => (float) $item->total_cost,
            ]),
            'created_at' => $result->created_at?->toISOString(),
        ], 'Purchase order created successfully.');
    }

    public function show(string $id): JsonResponse
    {
        $po = PurchaseOrder::with(['supplier', 'items.ingredient', 'creator'])->find($id);

        if (!$po) {
            return $this->notFound('Purchase order not found.');
        }

        return $this->success([
            'id' => $po->id,
            'po_number' => $po->po_number,
            'total_amount' => (float) $po->total_amount,
            'status' => $po->status,
            'notes' => $po->notes,
            'expected_date' => $po->expected_date?->toDateString(),
            'received_at' => $po->received_at?->toISOString(),
            'supplier' => $po->supplier ? [
                'id' => $po->supplier->id,
                'name' => $po->supplier->name,
                'contact_person' => $po->supplier->contact_person,
                'phone' => $po->supplier->phone,
            ] : null,
            'items' => $po->items->map(fn (PurchaseOrderItem $item) => [
                'id' => $item->id,
                'ingredient_id' => $item->ingredient_id,
                'ingredient' => $item->ingredient ? [
                    'name' => $item->ingredient->name,
                    'unit' => $item->ingredient->unit,
                ] : null,
                'quantity' => (float) $item->quantity,
                'unit_cost' => (float) $item->unit_cost,
                'total_cost' => (float) $item->total_cost,
            ]),
            'creator' => $po->creator ? [
                'name' => $po->creator->name,
            ] : null,
            'created_at' => $po->created_at?->toISOString(),
            'updated_at' => $po->updated_at?->toISOString(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $po = PurchaseOrder::find($id);

        if (!$po) {
            return $this->notFound('Purchase order not found.');
        }

        if (!in_array($po->status, ['pending', 'confirmed'])) {
            return $this->error('Cannot modify a purchase order with status: ' . $po->status, 409);
        }

        $validated = $request->validate([
            'supplier_id' => 'sometimes|exists:suppliers,id',
            'notes' => 'nullable|string|max:2000',
            'expected_date' => 'nullable|date|after:now',
            'items' => 'sometimes|array|min:1',
            'items.*.ingredient_id' => 'required|string|exists:ingredients,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_cost' => 'required|numeric|min:0',
        ]);

        $itemsData = $validated['items'] ?? null;
        unset($validated['items']);

        DB::transaction(function () use ($po, $validated, $itemsData) {
            $po->update(collect($validated)->only(['supplier_id', 'notes', 'expected_date'])->toArray());

            if ($itemsData !== null) {
                $po->items()->delete();

                $totalAmount = 0;
                foreach ($itemsData as $itemData) {
                    $itemTotal = $itemData['quantity'] * $itemData['unit_cost'];
                    $totalAmount += $itemTotal;

                    PurchaseOrderItem::create([
                        'purchase_order_id' => $po->id,
                        'ingredient_id' => $itemData['ingredient_id'],
                        'quantity' => $itemData['quantity'],
                        'unit_cost' => $itemData['unit_cost'],
                        'total_cost' => $itemTotal,
                    ]);
                }

                $po->update(['total_amount' => $totalAmount]);
            }
        });

        $po->load(['supplier', 'items.ingredient']);

        return $this->success([
            'id' => $po->id,
            'po_number' => $po->po_number,
            'total_amount' => (float) $po->total_amount,
            'status' => $po->status,
            'items' => $po->items->map(fn (PurchaseOrderItem $item) => [
                'id' => $item->id,
                'ingredient_id' => $item->ingredient_id,
                'quantity' => (float) $item->quantity,
                'unit_cost' => (float) $item->unit_cost,
                'total_cost' => (float) $item->total_cost,
            ]),
            'updated_at' => $po->updated_at?->toISOString(),
        ], 'Purchase order updated successfully.');
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $po = PurchaseOrder::with('items')->find($id);

        if (!$po) {
            return $this->notFound('Purchase order not found.');
        }

        $validated = $request->validate([
            'status' => 'required|string|in:pending,confirmed,received,cancelled',
        ]);

        if ($validated['status'] === 'received') {
            DB::transaction(function () use ($po, $request) {
                foreach ($po->items as $item) {
                    $ingredient = Ingredient::find($item->ingredient_id);
                    if ($ingredient) {
                        $ingredient->increment('current_stock', $item->quantity);

                        StockMovement::create([
                            'ingredient_id' => $item->ingredient_id,
                            'type' => 'inward',
                            'quantity' => $item->quantity,
                            'unit_cost' => (float) $item->unit_cost,
                            'notes' => "PO {$po->po_number} received",
                            'created_by' => $request->user()->id,
                        ]);
                    }
                }

                $po->update([
                    'status' => 'received',
                    'received_at' => now(),
                ]);
            });
        } else {
            $po->update(['status' => $validated['status']]);
        }

        return $this->success([
            'id' => $po->id,
            'po_number' => $po->po_number,
            'status' => $po->status,
            'received_at' => $po->received_at?->toISOString(),
        ], 'Purchase order status updated.');
    }
}
