<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Menu;

use App\Http\Controllers\Controller;
use App\Models\MenuModifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ModifierController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = MenuModifier::query();

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($search = $request->input('search')) {
            $query->whereRaw('LOWER(name) LIKE ?', ["%".strtolower($search)."%"]);
        }

        $modifiers = $query->orderBy('created_at', 'desc')->get();

        $data = $modifiers->map(fn (MenuModifier $m) => [
            'id' => $m->id,
            'name' => $m->name,
            'price' => (float) $m->price,
            'is_active' => $m->is_active,
            'created_at' => $m->created_at?->toISOString(),
            'updated_at' => $m->updated_at?->toISOString(),
        ]);

        return $this->success(['items' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $modifier = MenuModifier::create($validated);

        \App\Services\AuditLogger::record('modifier_created', $modifier, [
            'description' => "Menu modifier {$modifier->name} created",
        ]);

        return $this->created([
            'id' => $modifier->id,
            'name' => $modifier->name,
            'price' => (float) $modifier->price,
            'is_active' => $modifier->is_active,
            'created_at' => $modifier->created_at?->toISOString(),
            'updated_at' => $modifier->updated_at?->toISOString(),
        ], 'Modifier created successfully.');
    }

    public function show(string $id): JsonResponse
    {
        $modifier = MenuModifier::find($id);

        if (!$modifier) {
            return $this->notFound('Modifier not found.');
        }

        return $this->success([
            'id' => $modifier->id,
            'name' => $modifier->name,
            'price' => (float) $modifier->price,
            'is_active' => $modifier->is_active,
            'created_at' => $modifier->created_at?->toISOString(),
            'updated_at' => $modifier->updated_at?->toISOString(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $modifier = MenuModifier::find($id);

        if (!$modifier) {
            return $this->notFound('Modifier not found.');
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'price' => 'sometimes|numeric|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $modifier->update($validated);

        \App\Services\AuditLogger::record('modifier_updated', $modifier, [
            'description' => "Menu modifier {$modifier->name} updated",
        ]);

        return $this->success([
            'id' => $modifier->id,
            'name' => $modifier->name,
            'price' => (float) $modifier->price,
            'is_active' => $modifier->is_active,
            'created_at' => $modifier->created_at?->toISOString(),
            'updated_at' => $modifier->updated_at?->toISOString(),
        ], 'Modifier updated successfully.');
    }

    public function destroy(string $id): JsonResponse
    {
        $modifier = MenuModifier::find($id);

        if (!$modifier) {
            return $this->notFound('Modifier not found.');
        }

        $modifier->delete();

        \App\Services\AuditLogger::record('modifier_archived', $modifier, [
            'description' => "Menu modifier {$modifier->name} archived",
        ]);

        return $this->noContent('Modifier deleted successfully.');
    }
}
