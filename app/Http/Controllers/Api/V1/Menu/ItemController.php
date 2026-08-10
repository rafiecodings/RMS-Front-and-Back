<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Menu;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ItemController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = MenuItem::with(['category', 'modifiers']);

        if ($categoryId = $request->input('category_id')) {
            $query->where('category_id', $categoryId);
        }

        if ($request->has('is_available')) {
            $query->where('is_available', $request->boolean('is_available'));
        }

        if ($request->has('is_featured')) {
            $query->where('is_featured', $request->boolean('is_featured'));
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%")
                    ->orWhere('sku', 'ilike', "%{$search}%");
            });
        }

        if ($tag = $request->input('tag')) {
            $query->whereJsonContains('tags', $tag);
        }

        $items = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $items->getCollection()->map(fn (MenuItem $item) => [
            'id' => $item->id,
            'name' => $item->name,
            'slug' => $item->slug,
            'description' => $item->description,
            'price' => (float) $item->price,
            'cost_price' => (float) $item->cost_price,
            'image_url' => $item->image_url,
            'sku' => $item->sku,
            'is_available' => $item->is_available,
            'is_featured' => $item->is_featured,
            'prep_time_minutes' => $item->prep_time_minutes,
            'tags' => $item->tags,
            'category' => $item->category ? [
                'id' => $item->category->id,
                'name' => $item->category->name,
            ] : null,
            'modifiers' => $item->modifiers->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'price' => (float) $m->price,
            ]),
            'created_at' => $item->created_at?->toISOString(),
            'updated_at' => $item->updated_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:menu_categories,id',
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:menu_items,slug',
            'description' => 'nullable|string|max:2000',
            'price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'image_url' => 'nullable|string|max:500',
            'sku' => 'nullable|string|max:100|unique:menu_items,sku',
            'is_available' => 'sometimes|boolean',
            'is_featured' => 'sometimes|boolean',
            'prep_time_minutes' => 'nullable|integer|min:0',
            'tags' => 'sometimes|array',
            'tags.*' => 'string|max:100',
            'modifier_ids' => 'sometimes|array',
            'modifier_ids.*' => 'string|exists:menu_modifiers,id',
        ]);

        $validated['slug'] = $validated['slug'] ?? Str::slug($validated['name']);

        $modifierIds = $validated['modifier_ids'] ?? [];
        unset($validated['modifier_ids']);

        $item = MenuItem::create($validated);

        if (!empty($modifierIds)) {
            $item->modifiers()->sync($modifierIds);
        }

        $item->load('modifiers');

        return $this->created([
            'id' => $item->id,
            'name' => $item->name,
            'slug' => $item->slug,
            'description' => $item->description,
            'price' => (float) $item->price,
            'cost_price' => (float) $item->cost_price,
            'image_url' => $item->image_url,
            'sku' => $item->sku,
            'is_available' => $item->is_available,
            'is_featured' => $item->is_featured,
            'prep_time_minutes' => $item->prep_time_minutes,
            'tags' => $item->tags,
            'category_id' => $item->category_id,
            'modifiers' => $item->modifiers->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'price' => (float) $m->price,
            ]),
            'created_at' => $item->created_at?->toISOString(),
            'updated_at' => $item->updated_at?->toISOString(),
        ], 'Menu item created successfully.');
    }

    public function show(string $id): JsonResponse
    {
        $item = MenuItem::with(['category', 'modifiers'])->find($id);

        if (!$item) {
            return $this->notFound('Menu item not found.');
        }

        return $this->success([
            'id' => $item->id,
            'name' => $item->name,
            'slug' => $item->slug,
            'description' => $item->description,
            'price' => (float) $item->price,
            'cost_price' => (float) $item->cost_price,
            'image_url' => $item->image_url,
            'sku' => $item->sku,
            'is_available' => $item->is_available,
            'is_featured' => $item->is_featured,
            'prep_time_minutes' => $item->prep_time_minutes,
            'tags' => $item->tags,
            'category' => $item->category ? [
                'id' => $item->category->id,
                'name' => $item->category->name,
            ] : null,
            'modifiers' => $item->modifiers->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'price' => (float) $m->price,
            ]),
            'created_at' => $item->created_at?->toISOString(),
            'updated_at' => $item->updated_at?->toISOString(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $item = MenuItem::find($id);

        if (!$item) {
            return $this->notFound('Menu item not found.');
        }

        $validated = $request->validate([
            'category_id' => 'sometimes|exists:menu_categories,id',
            'name' => 'sometimes|string|max:255',
            'slug' => "sometimes|string|max:255|unique:menu_items,slug,{$id}",
            'description' => 'nullable|string|max:2000',
            'price' => 'sometimes|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'image_url' => 'nullable|string|max:500',
            'sku' => "nullable|string|max:100|unique:menu_items,sku,{$id}",
            'is_available' => 'sometimes|boolean',
            'is_featured' => 'sometimes|boolean',
            'prep_time_minutes' => 'nullable|integer|min:0',
            'tags' => 'sometimes|array',
            'tags.*' => 'string|max:100',
            'modifier_ids' => 'sometimes|array',
            'modifier_ids.*' => 'string|exists:menu_modifiers,id',
        ]);

        if (isset($validated['name']) && !isset($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $modifierIds = $validated['modifier_ids'] ?? null;
        unset($validated['modifier_ids']);

        $item->update($validated);

        if ($modifierIds !== null) {
            $item->modifiers()->sync($modifierIds);
        }

        $item->load('modifiers');

        return $this->success([
            'id' => $item->id,
            'name' => $item->name,
            'slug' => $item->slug,
            'description' => $item->description,
            'price' => (float) $item->price,
            'cost_price' => (float) $item->cost_price,
            'image_url' => $item->image_url,
            'sku' => $item->sku,
            'is_available' => $item->is_available,
            'is_featured' => $item->is_featured,
            'prep_time_minutes' => $item->prep_time_minutes,
            'tags' => $item->tags,
            'category_id' => $item->category_id,
            'modifiers' => $item->modifiers->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'price' => (float) $m->price,
            ]),
            'created_at' => $item->created_at?->toISOString(),
            'updated_at' => $item->updated_at?->toISOString(),
        ], 'Menu item updated successfully.');
    }

    public function destroy(string $id): JsonResponse
    {
        $item = MenuItem::find($id);

        if (!$item) {
            return $this->notFound('Menu item not found.');
        }

        $item->modifiers()->detach();
        $item->delete();

        return $this->success(['id' => $id], 'Menu item deleted successfully.');
    }

    public function toggleAvailability(string $id): JsonResponse
    {
        $item = MenuItem::find($id);

        if (!$item) {
            return $this->notFound('Menu item not found.');
        }

        $item->update(['is_available' => !$item->is_available]);

        return $this->success([
            'id' => $item->id,
            'name' => $item->name,
            'is_available' => $item->is_available,
        ], 'Menu item availability updated.');
    }

    public function uploadImage(Request $request, string $id): JsonResponse
    {
        $item = MenuItem::find($id);

        if (!$item) {
            return $this->notFound('Menu item not found.');
        }

        $request->validate([
            'image' => 'required|image|max:5120|mimes:jpeg,png,webp',
        ]);

        if ($item->image_url && str_starts_with($item->image_url, 'storage/')) {
            Storage::delete(str_replace('storage/', '', $item->image_url));
        }

        $path = $request->file('image')->store('menu-items', 'public');
        $item->update(['image_url' => Storage::url($path)]);

        return $this->success([
            'id' => $item->id,
            'image_url' => $item->image_url,
        ], 'Image uploaded successfully.');
    }
}
