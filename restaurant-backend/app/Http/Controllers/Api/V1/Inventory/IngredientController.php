<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Ingredient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IngredientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Ingredient::with('supplier');

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }

        if ($supplierId = $request->input('supplier_id')) {
            $query->where('supplier_id', $supplierId);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('sku', 'ilike', "%{$search}%");
            });
        }

        if ($request->boolean('low_stock')) {
            $query->whereColumn('current_stock', '<=', 'minimum_stock');
        }

        $ingredients = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $ingredients->getCollection()->map(fn (Ingredient $i) => [
            'id' => $i->id,
            'name' => $i->name,
            'sku' => $i->sku,
            'category' => $i->category,
            'unit' => $i->unit,
            'current_stock' => (float) $i->current_stock,
            'minimum_stock' => (float) $i->minimum_stock,
            'maximum_stock' => (float) $i->maximum_stock,
            'cost_per_unit' => (float) $i->cost_per_unit,
            'storage_location' => $i->storage_location,
            'is_active' => $i->is_active,
            'is_low_stock' => (float) $i->current_stock <= (float) $i->minimum_stock,
            'supplier' => $i->supplier ? [
                'id' => $i->supplier->id,
                'name' => $i->supplier->name,
            ] : null,
            'created_at' => $i->created_at?->toISOString(),
            'updated_at' => $i->updated_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $ingredients->currentPage(),
                'last_page' => $ingredients->lastPage(),
                'per_page' => $ingredients->perPage(),
                'total' => $ingredients->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'sku' => 'nullable|string|max:100|unique:ingredients,sku',
            'category' => 'nullable|string|max:255',
            'unit' => 'required|string|max:50',
            'current_stock' => 'sometimes|numeric|min:0',
            'minimum_stock' => 'sometimes|numeric|min:0',
            'maximum_stock' => 'nullable|numeric|min:0',
            'cost_per_unit' => 'required|numeric|min:0',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'storage_location' => 'nullable|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $ingredient = Ingredient::create($validated);

        return $this->created([
            'id' => $ingredient->id,
            'name' => $ingredient->name,
            'sku' => $ingredient->sku,
            'category' => $ingredient->category,
            'unit' => $ingredient->unit,
            'current_stock' => (float) $ingredient->current_stock,
            'minimum_stock' => (float) $ingredient->minimum_stock,
            'maximum_stock' => (float) $ingredient->maximum_stock,
            'cost_per_unit' => (float) $ingredient->cost_per_unit,
            'storage_location' => $ingredient->storage_location,
            'is_active' => $ingredient->is_active,
            'supplier_id' => $ingredient->supplier_id,
            'created_at' => $ingredient->created_at?->toISOString(),
            'updated_at' => $ingredient->updated_at?->toISOString(),
        ], 'Ingredient created successfully.');
    }

    public function show(string $id): JsonResponse
    {
        $ingredient = Ingredient::with('supplier')->find($id);

        if (!$ingredient) {
            return $this->notFound('Ingredient not found.');
        }

        return $this->success([
            'id' => $ingredient->id,
            'name' => $ingredient->name,
            'sku' => $ingredient->sku,
            'category' => $ingredient->category,
            'unit' => $ingredient->unit,
            'current_stock' => (float) $ingredient->current_stock,
            'minimum_stock' => (float) $ingredient->minimum_stock,
            'maximum_stock' => (float) $ingredient->maximum_stock,
            'cost_per_unit' => (float) $ingredient->cost_per_unit,
            'storage_location' => $ingredient->storage_location,
            'is_active' => $ingredient->is_active,
            'is_low_stock' => (float) $ingredient->current_stock <= (float) $ingredient->minimum_stock,
            'supplier' => $ingredient->supplier ? [
                'id' => $ingredient->supplier->id,
                'name' => $ingredient->supplier->name,
            ] : null,
            'created_at' => $ingredient->created_at?->toISOString(),
            'updated_at' => $ingredient->updated_at?->toISOString(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $ingredient = Ingredient::find($id);

        if (!$ingredient) {
            return $this->notFound('Ingredient not found.');
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'sku' => "sometimes|string|max:100|unique:ingredients,sku,{$id}",
            'category' => 'nullable|string|max:255',
            'unit' => 'sometimes|string|max:50',
            'minimum_stock' => 'sometimes|numeric|min:0',
            'maximum_stock' => 'nullable|numeric|min:0',
            'cost_per_unit' => 'sometimes|numeric|min:0',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'storage_location' => 'nullable|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $ingredient->update($validated);

        return $this->success([
            'id' => $ingredient->id,
            'name' => $ingredient->name,
            'sku' => $ingredient->sku,
            'category' => $ingredient->category,
            'unit' => $ingredient->unit,
            'current_stock' => (float) $ingredient->current_stock,
            'minimum_stock' => (float) $ingredient->minimum_stock,
            'maximum_stock' => (float) $ingredient->maximum_stock,
            'cost_per_unit' => (float) $ingredient->cost_per_unit,
            'storage_location' => $ingredient->storage_location,
            'is_active' => $ingredient->is_active,
            'supplier_id' => $ingredient->supplier_id,
            'created_at' => $ingredient->created_at?->toISOString(),
            'updated_at' => $ingredient->updated_at?->toISOString(),
        ], 'Ingredient updated successfully.');
    }

    public function destroy(string $id): JsonResponse
    {
        $ingredient = Ingredient::find($id);

        if (!$ingredient) {
            return $this->notFound('Ingredient not found.');
        }

        $ingredient->delete();

        return $this->noContent('Ingredient deleted successfully.');
    }
}
