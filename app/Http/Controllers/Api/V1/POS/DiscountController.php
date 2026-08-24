<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\POS;

use App\Http\Controllers\Controller;
use App\Models\Discount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DiscountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Discount::query();

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('code', 'ilike', "%{$search}%");
            });
        }

        $discounts = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $discounts->getCollection()->map(fn (Discount $d) => [
            'id' => $d->id,
            'name' => $d->name,
            'code' => $d->code,
            'type' => $d->type,
            'value' => (float) $d->value,
            'min_order_amount' => (float) $d->min_order_amount,
            'max_discount_amount' => $d->max_discount_amount ? (float) $d->max_discount_amount : null,
            'max_uses' => $d->max_uses,
            'used_count' => $d->used_count,
            'start_date' => $d->start_date?->toISOString(),
            'end_date' => $d->end_date?->toISOString(),
            'is_active' => $d->is_active,
            'applies_to' => $d->applies_to,
            'description' => $d->description,
            'created_at' => $d->created_at?->toISOString(),
            'updated_at' => $d->updated_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $discounts->currentPage(),
                'last_page' => $discounts->lastPage(),
                'per_page' => $discounts->perPage(),
                'total' => $discounts->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:discounts,code',
            'type' => 'required|string|in:percentage,fixed',
            'value' => 'required|numeric|min:0',
            'min_order_amount' => 'sometimes|numeric|min:0',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'max_uses' => 'nullable|integer|min:1',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'is_active' => 'sometimes|boolean',
            'applies_to' => 'sometimes|string|in:all,menu_items,combos',
            'description' => 'nullable|string|max:1000',
        ]);

        $validated['used_count'] = 0;

        $discount = Discount::create($validated);

        return $this->created([
            'id' => $discount->id,
            'name' => $discount->name,
            'code' => $discount->code,
            'type' => $discount->type,
            'value' => (float) $discount->value,
            'min_order_amount' => (float) $discount->min_order_amount,
            'max_discount_amount' => $discount->max_discount_amount ? (float) $discount->max_discount_amount : null,
            'max_uses' => $discount->max_uses,
            'used_count' => $discount->used_count,
            'start_date' => $discount->start_date?->toISOString(),
            'end_date' => $discount->end_date?->toISOString(),
            'is_active' => $discount->is_active,
            'applies_to' => $discount->applies_to,
            'description' => $discount->description,
            'created_at' => $discount->created_at?->toISOString(),
            'updated_at' => $discount->updated_at?->toISOString(),
        ], 'Discount created successfully.');
    }

    public function show(string $id): JsonResponse
    {
        $discount = Discount::find($id);

        if (! $discount) {
            return $this->notFound('Discount not found.');
        }

        return $this->success([
            'id' => $discount->id,
            'name' => $discount->name,
            'code' => $discount->code,
            'type' => $discount->type,
            'value' => (float) $discount->value,
            'min_order_amount' => (float) $discount->min_order_amount,
            'max_discount_amount' => $discount->max_discount_amount ? (float) $discount->max_discount_amount : null,
            'max_uses' => $discount->max_uses,
            'used_count' => $discount->used_count,
            'start_date' => $discount->start_date?->toISOString(),
            'end_date' => $discount->end_date?->toISOString(),
            'is_active' => $discount->is_active,
            'applies_to' => $discount->applies_to,
            'description' => $discount->description,
            'created_at' => $discount->created_at?->toISOString(),
            'updated_at' => $discount->updated_at?->toISOString(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $discount = Discount::find($id);

        if (! $discount) {
            return $this->notFound('Discount not found.');
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => "sometimes|string|max:50|unique:discounts,code,{$id}",
            'type' => 'sometimes|string|in:percentage,fixed',
            'value' => 'sometimes|numeric|min:0',
            'min_order_amount' => 'sometimes|numeric|min:0',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'max_uses' => 'nullable|integer|min:1',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after:start_date',
            'is_active' => 'sometimes|boolean',
            'applies_to' => 'sometimes|string|in:all,menu_items,combos',
            'description' => 'nullable|string|max:1000',
        ]);

        $discount->update($validated);

        return $this->success([
            'id' => $discount->id,
            'name' => $discount->name,
            'code' => $discount->code,
            'type' => $discount->type,
            'value' => (float) $discount->value,
            'min_order_amount' => (float) $discount->min_order_amount,
            'max_discount_amount' => $discount->max_discount_amount ? (float) $discount->max_discount_amount : null,
            'max_uses' => $discount->max_uses,
            'used_count' => $discount->used_count,
            'start_date' => $discount->start_date?->toISOString(),
            'end_date' => $discount->end_date?->toISOString(),
            'is_active' => $discount->is_active,
            'applies_to' => $discount->applies_to,
            'description' => $discount->description,
            'created_at' => $discount->created_at?->toISOString(),
            'updated_at' => $discount->updated_at?->toISOString(),
        ], 'Discount updated successfully.');
    }

    public function destroy(string $id): JsonResponse
    {
        $discount = Discount::find($id);

        if (! $discount) {
            return $this->notFound('Discount not found.');
        }

        $discount->delete();

        return $this->noContent('Discount deleted successfully.');
    }
}
