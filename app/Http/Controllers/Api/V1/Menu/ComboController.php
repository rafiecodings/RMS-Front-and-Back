<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Menu;

use App\Http\Controllers\Controller;
use App\Models\MenuCombo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ComboController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = MenuCombo::with('items');

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        $combos = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $combos->getCollection()->map(fn (MenuCombo $combo) => [
            'id' => $combo->id,
            'name' => $combo->name,
            'description' => $combo->description,
            'price' => (float) $combo->price,
            'is_active' => $combo->is_active,
            'items' => $combo->items->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->name,
                'price' => (float) $item->price,
            ]),
            'created_at' => $combo->created_at?->toISOString(),
            'updated_at' => $combo->updated_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $combos->currentPage(),
                'last_page' => $combos->lastPage(),
                'per_page' => $combos->perPage(),
                'total' => $combos->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'price' => 'required|numeric|min:0',
            'is_active' => 'sometimes|boolean',
            'item_ids' => 'required|array|min:1',
            'item_ids.*' => 'string|exists:menu_items,id',
        ]);

        $itemIds = $validated['item_ids'];
        unset($validated['item_ids']);

        $combo = MenuCombo::create($validated);
        $combo->items()->sync($itemIds);

        $combo->load('items');

        return $this->created([
            'id' => $combo->id,
            'name' => $combo->name,
            'description' => $combo->description,
            'price' => (float) $combo->price,
            'is_active' => $combo->is_active,
            'items' => $combo->items->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->name,
                'price' => (float) $item->price,
            ]),
            'created_at' => $combo->created_at?->toISOString(),
            'updated_at' => $combo->updated_at?->toISOString(),
        ], 'Combo created successfully.');
    }

    public function show(string $id): JsonResponse
    {
        $combo = MenuCombo::with('items')->find($id);

        if (! $combo) {
            return $this->notFound('Combo not found.');
        }

        return $this->success([
            'id' => $combo->id,
            'name' => $combo->name,
            'description' => $combo->description,
            'price' => (float) $combo->price,
            'is_active' => $combo->is_active,
            'items' => $combo->items->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->name,
                'price' => (float) $item->price,
            ]),
            'created_at' => $combo->created_at?->toISOString(),
            'updated_at' => $combo->updated_at?->toISOString(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $combo = MenuCombo::find($id);

        if (! $combo) {
            return $this->notFound('Combo not found.');
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:2000',
            'price' => 'sometimes|numeric|min:0',
            'is_active' => 'sometimes|boolean',
            'item_ids' => 'sometimes|array|min:1',
            'item_ids.*' => 'string|exists:menu_items,id',
        ]);

        $itemIds = $validated['item_ids'] ?? null;
        unset($validated['item_ids']);

        $combo->update($validated);

        if ($itemIds !== null) {
            $combo->items()->sync($itemIds);
        }

        $combo->load('items');

        return $this->success([
            'id' => $combo->id,
            'name' => $combo->name,
            'description' => $combo->description,
            'price' => (float) $combo->price,
            'is_active' => $combo->is_active,
            'items' => $combo->items->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->name,
                'price' => (float) $item->price,
            ]),
            'created_at' => $combo->created_at?->toISOString(),
            'updated_at' => $combo->updated_at?->toISOString(),
        ], 'Combo updated successfully.');
    }

    public function destroy(string $id): JsonResponse
    {
        $combo = MenuCombo::find($id);

        if (! $combo) {
            return $this->notFound('Combo not found.');
        }

        $combo->items()->detach();
        $combo->delete();

        return $this->noContent('Combo deleted successfully.');
    }
}
