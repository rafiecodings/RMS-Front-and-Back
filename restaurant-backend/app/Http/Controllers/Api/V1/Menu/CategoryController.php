<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Menu;

use App\Http\Controllers\Controller;
use App\Models\MenuCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = MenuCategory::withCount('items');

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($search = $request->input('search')) {
            $query->whereRaw('LOWER(name) LIKE ?', ["%".strtolower($search)."%"]);
        }

        $categories = $query->orderBy('sort_order')
            ->orderBy('created_at', 'desc')
            ->get();

        $data = $categories->map(fn (MenuCategory $c) => [
            'id' => $c->id,
            'name' => $c->name,
            'slug' => $c->slug,
            'description' => $c->description,
            'image_url' => $c->image_url,
            'sort_order' => $c->sort_order,
            'is_active' => $c->is_active,
            'items_count' => $c->items_count,
            'created_at' => $c->created_at?->toISOString(),
            'updated_at' => $c->updated_at?->toISOString(),
        ]);

        return $this->success(['items' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:menu_categories,slug',
            'description' => 'nullable|string|max:1000',
            'image_url' => 'nullable|string|max:500',
            'sort_order' => 'sometimes|integer|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $validated['slug'] = $validated['slug'] ?? Str::slug($validated['name']);

        $category = MenuCategory::create($validated);

        \App\Services\AuditLogger::record('category_created', $category, [
            'description' => "Menu category {$category->name} created",
        ]);

        return $this->created([
            'id' => $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
            'description' => $category->description,
            'image_url' => $category->image_url,
            'sort_order' => $category->sort_order,
            'is_active' => $category->is_active,
            'items_count' => 0,
            'created_at' => $category->created_at?->toISOString(),
            'updated_at' => $category->updated_at?->toISOString(),
        ], 'Category created successfully.');
    }

    public function show(string $id): JsonResponse
    {
        $category = MenuCategory::with(['items' => fn ($q) => $q->orderBy('name')])->withCount('items')->find($id);

        if (!$category) {
            return $this->notFound('Category not found.');
        }

        return $this->success([
            'id' => $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
            'description' => $category->description,
            'image_url' => $category->image_url,
            'sort_order' => $category->sort_order,
            'is_active' => $category->is_active,
            'items_count' => $category->items_count,
            'items' => $category->items->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->name,
                'price' => (float) $item->price,
                'is_available' => $item->is_available,
            ]),
            'created_at' => $category->created_at?->toISOString(),
            'updated_at' => $category->updated_at?->toISOString(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $category = MenuCategory::find($id);

        if (!$category) {
            return $this->notFound('Category not found.');
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => "sometimes|string|max:255|unique:menu_categories,slug,{$id}",
            'description' => 'nullable|string|max:1000',
            'image_url' => 'nullable|string|max:500',
            'sort_order' => 'sometimes|integer|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        if (isset($validated['name']) && !isset($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $category->update($validated);

        \App\Services\AuditLogger::record('category_updated', $category, [
            'description' => "Menu category {$category->name} updated",
        ]);

        return $this->success([
            'id' => $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
            'description' => $category->description,
            'image_url' => $category->image_url,
            'sort_order' => $category->sort_order,
            'is_active' => $category->is_active,
            'created_at' => $category->created_at?->toISOString(),
            'updated_at' => $category->updated_at?->toISOString(),
        ], 'Category updated successfully.');
    }

    public function destroy(string $id): JsonResponse
    {
        $category = MenuCategory::find($id);

        if (!$category) {
            return $this->notFound('Category not found.');
        }

        if ($category->items()->count() > 0) {
            return $this->error('Cannot delete category with menu items.', 409);
        }

        $category->delete();

        \App\Services\AuditLogger::record('category_archived', $category, [
            'description' => "Menu category {$category->name} archived",
        ]);

        return $this->noContent('Category deleted successfully.');
    }
}
