<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Recipe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecipeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Recipe::with(['menuItem', 'ingredients']);

        if ($search = $request->input('search')) {
            $query->whereHas('menuItem', fn ($q) => $q->whereRaw('LOWER(name) LIKE ?', ["%".strtolower($search)."%"]));
        }

        $recipes = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $recipes->getCollection()->map(fn (Recipe $r) => [
            'id' => $r->id,
            'menu_item_id' => $r->menu_item_id,
            'menu_item_name' => $r->menuItem?->name,
            'instructions' => $r->instructions,
            'yield_quantity' => (float) $r->yield_quantity,
            'yield_unit' => $r->yield_unit,
            'ingredients' => $r->ingredients->map(fn ($i) => [
                'id' => $i->pivot->id ?? ($r->id . '-' . $i->id),
                'ingredient_id' => $i->id,
                'name' => $i->name,
                'ingredient' => [
                    'id' => $i->id,
                    'name' => $i->name,
                    'unit' => $i->unit,
                    'category' => $i->category,
                ],
                'quantity' => (float) $i->pivot->quantity,
                'unit' => $i->unit,
                'cost' => (float) $i->pivot->quantity * (float) $i->cost_per_unit,
            ])->values()->toArray(),
            'ingredients_count' => $r->ingredients->count(),
            'created_at' => $r->created_at?->toISOString(),
            'updated_at' => $r->updated_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $recipes->currentPage(),
                'last_page' => $recipes->lastPage(),
                'per_page' => $recipes->perPage(),
                'total' => $recipes->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'menu_item_id' => 'required|string|exists:menu_items,id|unique:recipes,menu_item_id',
            'instructions' => 'nullable|string|max:5000',
            'yield_quantity' => 'required|numeric|min:0',
            'yield_unit' => 'required|string|max:50',
            'ingredients' => 'required|array|min:1',
            'ingredients.*.ingredient_id' => 'required|string|exists:ingredients,id',
            'ingredients.*.quantity' => 'required|numeric|min:0.001',
        ]);

        $ingredientData = $validated['ingredients'];
        unset($validated['ingredients']);

        $recipe = Recipe::create($validated);

        foreach ($ingredientData as $ing) {
            $recipe->ingredients()->attach($ing['ingredient_id'], [
                'quantity' => $ing['quantity'],
            ]);
        }

        $recipe->load('ingredients');

        \App\Services\AuditLogger::record('recipe_created', $recipe, [
            'description' => 'Recipe created for menu item '.($recipe->menuItem?->name ?? $recipe->menu_item_id),
        ]);

        return $this->created([
            'id' => $recipe->id,
            'instructions' => $recipe->instructions,
            'yield_quantity' => (float) $recipe->yield_quantity,
            'yield_unit' => $recipe->yield_unit,
            'menu_item' => $recipe->menuItem ? [
                'id' => $recipe->menuItem->id,
                'name' => $recipe->menuItem->name,
            ] : null,
            'ingredients' => $recipe->ingredients->map(fn ($i) => [
                'id' => $i->id,
                'name' => $i->name,
                'unit' => $i->unit,
                'quantity' => (float) $i->pivot->quantity,
            ]),
            'created_at' => $recipe->created_at?->toISOString(),
        ], 'Recipe created successfully.');
    }

    public function show(string $id): JsonResponse
    {
        $recipe = Recipe::with(['menuItem', 'ingredients'])->find($id);

        if (!$recipe) {
            return $this->notFound('Recipe not found.');
        }

        return $this->success([
            'id' => $recipe->id,
            'instructions' => $recipe->instructions,
            'yield_quantity' => (float) $recipe->yield_quantity,
            'yield_unit' => $recipe->yield_unit,
            'menu_item' => $recipe->menuItem ? [
                'id' => $recipe->menuItem->id,
                'name' => $recipe->menuItem->name,
                'price' => (float) $recipe->menuItem->price,
            ] : null,
            'ingredients' => $recipe->ingredients->map(fn ($i) => [
                'id' => $i->id,
                'name' => $i->name,
                'ingredient' => [
                    'id' => $i->id,
                    'name' => $i->name,
                    'unit' => $i->unit,
                    'category' => $i->category,
                ],
                'unit' => $i->unit,
                'quantity' => (float) $i->pivot->quantity,
                'cost_per_unit' => (float) $i->cost_per_unit,
                'cost' => (float) $i->pivot->quantity * (float) $i->cost_per_unit,
                'total_cost' => (float) $i->pivot->quantity * (float) $i->cost_per_unit,
            ]),
            'created_at' => $recipe->created_at?->toISOString(),
            'updated_at' => $recipe->updated_at?->toISOString(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $recipe = Recipe::find($id);

        if (!$recipe) {
            return $this->notFound('Recipe not found.');
        }

        $validated = $request->validate([
            'instructions' => 'nullable|string|max:5000',
            'yield_quantity' => 'sometimes|numeric|min:0',
            'yield_unit' => 'sometimes|string|max:50',
            'ingredients' => 'sometimes|array|min:1',
            'ingredients.*.ingredient_id' => 'required|string|exists:ingredients,id',
            'ingredients.*.quantity' => 'required|numeric|min:0.001',
        ]);

        $ingredientData = $validated['ingredients'] ?? null;
        unset($validated['ingredients']);

        $recipe->update($validated);

        if ($ingredientData !== null) {
            $recipe->ingredients()->detach();
            foreach ($ingredientData as $ing) {
                $recipe->ingredients()->attach($ing['ingredient_id'], [
                    'quantity' => $ing['quantity'],
                ]);
            }
        }

        $recipe->load('ingredients');

        \App\Services\AuditLogger::record('recipe_updated', $recipe, [
            'description' => 'Recipe updated for menu item '.($recipe->menuItem?->name ?? $recipe->menu_item_id),
        ]);

        return $this->success([
            'id' => $recipe->id,
            'instructions' => $recipe->instructions,
            'yield_quantity' => (float) $recipe->yield_quantity,
            'yield_unit' => $recipe->yield_unit,
            'ingredients' => $recipe->ingredients->map(fn ($i) => [
                'id' => $i->id,
                'name' => $i->name,
                'unit' => $i->unit,
                'quantity' => (float) $i->pivot->quantity,
            ]),
            'created_at' => $recipe->created_at?->toISOString(),
            'updated_at' => $recipe->updated_at?->toISOString(),
        ], 'Recipe updated successfully.');
    }

    public function destroy(string $id): JsonResponse
    {
        $recipe = Recipe::find($id);

        if (!$recipe) {
            return $this->notFound('Recipe not found.');
        }

        $recipe->ingredients()->detach();
        $recipe->delete();

        \App\Services\AuditLogger::record('recipe_deleted', $recipe, [
            'description' => 'Recipe deleted for menu item '.($recipe->menuItem?->name ?? $recipe->menu_item_id),
        ]);

        return $this->noContent('Recipe deleted successfully.');
    }
}
