<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Ingredient;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = StockMovement::with(['ingredient', 'creator']);

        if ($ingredientId = $request->input('ingredient_id')) {
            $query->where('ingredient_id', $ingredientId);
        }

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        $movements = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $movements->getCollection()->map(fn (StockMovement $m) => [
            'id' => $m->id,
            'type' => $m->type,
            'quantity' => (float) $m->quantity,
            'unit_cost' => (float) $m->unit_cost,
            'total_cost' => (float) $m->quantity * (float) $m->unit_cost,
            'notes' => $m->notes,
            'ingredient' => $m->ingredient ? [
                'id' => $m->ingredient->id,
                'name' => $m->ingredient->name,
                'unit' => $m->ingredient->unit,
                'current_stock' => (float) $m->ingredient->current_stock,
            ] : null,
            'creator' => $m->creator ? [
                'name' => $m->creator->name,
            ] : null,
            'created_at' => $m->created_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $movements->currentPage(),
                'last_page' => $movements->lastPage(),
                'per_page' => $movements->perPage(),
                'total' => $movements->total(),
            ],
        ]);
    }

    public function inward(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ingredient_id' => 'required|string|exists:ingredients,id',
            'quantity' => 'required|numeric|min:0.001',
            'unit_cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        $result = DB::transaction(function () use ($validated, $request) {
            $ingredient = Ingredient::lockForUpdate()->find($validated['ingredient_id']);

            if (! $ingredient || ! $ingredient->is_active) {
                abort(response()->json([
                    'success' => false,
                    'message' => 'Cannot record delivery for an inactive ingredient.',
                ], 422));
            }

            $movementUnitCost = $validated['unit_cost'] ?? $ingredient->cost_per_unit ?? 0;

            $ingredient->increment('current_stock', $validated['quantity']);

            $movement = StockMovement::create([
                'ingredient_id' => $validated['ingredient_id'],
                'type' => 'inward',
                'quantity' => $validated['quantity'],
                'unit_cost' => $movementUnitCost,
                'notes' => $validated['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            return ['ingredient' => $ingredient, 'movement' => $movement];
        });

        \App\Services\AuditLogger::record('stock_restocked', $result['movement'], [
            'description' => "Stock restocked: {$result['ingredient']->name} (+{$validated['quantity']})",
            'quantity' => (float) $validated['quantity'],
        ]);

        return $this->created([
            'movement' => [
                'id' => $result['movement']->id,
                'type' => $result['movement']->type,
                'quantity' => (float) $result['movement']->quantity,
                'unit_cost' => (float) $result['movement']->unit_cost,
            ],
            'ingredient' => [
                'id' => $result['ingredient']->id,
                'name' => $result['ingredient']->name,
                'current_stock' => (float) $result['ingredient']->current_stock,
            ],
        ], 'Stock inward recorded successfully.');
    }

    public function outward(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ingredient_id' => 'required|string|exists:ingredients,id',
            'quantity' => 'required|numeric|min:0.001',
            'notes' => 'nullable|string|max:1000',
        ]);

        $result = DB::transaction(function () use ($validated, $request) {
            $ingredient = Ingredient::lockForUpdate()->find($validated['ingredient_id']);

            if ((float) $ingredient->current_stock < $validated['quantity']) {
                return ['error' => 'Insufficient stock.'];
            }

            $ingredient->decrement('current_stock', $validated['quantity']);

            $movement = StockMovement::create([
                'ingredient_id' => $validated['ingredient_id'],
                'type' => 'outward',
                'quantity' => $validated['quantity'],
                'unit_cost' => (float) $ingredient->cost_per_unit,
                'notes' => $validated['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            return ['ingredient' => $ingredient, 'movement' => $movement];
        });

        if (isset($result['error'])) {
            return $this->error($result['error'], 422);
        }

        \App\Services\AuditLogger::record('stock_deducted', $result['movement'], [
            'description' => "Stock deducted: {$result['ingredient']->name} (-{$validated['quantity']})",
            'quantity' => (float) $validated['quantity'],
        ]);

        return $this->created([
            'movement' => [
                'id' => $result['movement']->id,
                'type' => $result['movement']->type,
                'quantity' => (float) $result['movement']->quantity,
            ],
            'ingredient' => [
                'id' => $result['ingredient']->id,
                'name' => $result['ingredient']->name,
                'current_stock' => (float) $result['ingredient']->current_stock,
            ],
        ], 'Stock outward recorded successfully.');
    }

    public function adjust(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ingredient_id' => 'required|string|exists:ingredients,id',
            'new_stock' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        $result = DB::transaction(function () use ($validated, $request) {
            $ingredient = Ingredient::lockForUpdate()->find($validated['ingredient_id']);
            $previousStock = (float) $ingredient->current_stock;
            $adjustment = $validated['new_stock'] - $previousStock;

            $ingredient->update(['current_stock' => $validated['new_stock']]);

            $movement = StockMovement::create([
                'ingredient_id' => $validated['ingredient_id'],
                'type' => 'adjustment',
                'quantity' => abs($adjustment),
                'unit_cost' => (float) $ingredient->cost_per_unit,
                'notes' => ($validated['notes'] ?? '') . " (From {$previousStock} to {$validated['new_stock']})",
                'created_by' => $request->user()->id,
            ]);

            return ['ingredient' => $ingredient, 'movement' => $movement];
        });

        \App\Services\AuditLogger::record('ingredient_adjusted', $result['movement'], [
            'description' => "Stock adjusted: {$result['ingredient']->name} set to {$validated['new_stock']}",
            'new_stock' => (float) $validated['new_stock'],
        ]);

        return $this->success([
            'movement' => [
                'id' => $result['movement']->id,
                'type' => $result['movement']->type,
                'quantity' => (float) $result['movement']->quantity,
            ],
            'ingredient' => [
                'id' => $result['ingredient']->id,
                'name' => $result['ingredient']->name,
                'current_stock' => (float) $result['ingredient']->current_stock,
            ],
        ], 'Stock adjusted successfully.');
    }

    public function transfer(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from_ingredient_id' => 'required|string|exists:ingredients,id',
            'to_ingredient_id' => 'required|string|exists:ingredients,id|different:from_ingredient_id',
            'quantity' => 'required|numeric|min:0.001',
            'notes' => 'nullable|string|max:1000',
        ]);

        $result = DB::transaction(function () use ($validated, $request) {
            $fromIngredient = Ingredient::lockForUpdate()->find($validated['from_ingredient_id']);
            $toIngredient = Ingredient::lockForUpdate()->find($validated['to_ingredient_id']);

            if ((float) $fromIngredient->current_stock < $validated['quantity']) {
                return ['error' => 'Insufficient stock in source ingredient.'];
            }

            $fromIngredient->decrement('current_stock', $validated['quantity']);
            $toIngredient->increment('current_stock', $validated['quantity']);

            StockMovement::create([
                'ingredient_id' => $validated['from_ingredient_id'],
                'type' => 'outward',
                'quantity' => $validated['quantity'],
                'unit_cost' => (float) $fromIngredient->cost_per_unit,
                'notes' => "Transfer to {$toIngredient->name}" . ($validated['notes'] ?? ''),
                'created_by' => $request->user()->id,
            ]);

            StockMovement::create([
                'ingredient_id' => $validated['to_ingredient_id'],
                'type' => 'inward',
                'quantity' => $validated['quantity'],
                'unit_cost' => (float) $fromIngredient->cost_per_unit,
                'notes' => "Transfer from {$fromIngredient->name}" . ($validated['notes'] ?? ''),
                'created_by' => $request->user()->id,
            ]);

            return [
                'from' => $fromIngredient,
                'to' => $toIngredient,
            ];
        });

        if (isset($result['error'])) {
            return $this->error($result['error'], 422);
        }

        \App\Services\AuditLogger::record('stock_transferred', $result['from'], [
            'description' => "Stock transferred: {$result['from']->name} → {$result['to']->name} ({$validated['quantity']})",
            'quantity' => (float) $validated['quantity'],
            'from_ingredient_id' => $result['from']->id,
            'to_ingredient_id' => $result['to']->id,
        ]);

        return $this->success([
            'from_ingredient' => [
                'id' => $result['from']->id,
                'name' => $result['from']->name,
                'current_stock' => (float) $result['from']->current_stock,
            ],
            'to_ingredient' => [
                'id' => $result['to']->id,
                'name' => $result['to']->name,
                'current_stock' => (float) $result['to']->current_stock,
            ],
        ], 'Stock transferred successfully.');
    }

    public function expiringItems(Request $request): JsonResponse
    {
        $days = $request->integer('days', 7);

        $ingredients = Ingredient::where('is_active', true)
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        return $this->success([
            'items' => $ingredients->map(fn (Ingredient $i) => [
                'id' => $i->id,
                'name' => $i->name,
                'current_stock' => (float) $i->current_stock,
                'unit' => $i->unit,
            ]),
            'days_threshold' => $days,
        ]);
    }

    public function reconciliation(Request $request): JsonResponse
    {
        $ingredients = Ingredient::where('is_active', true)
            ->orderBy('name')
            ->get();

        $data = $ingredients->map(fn (Ingredient $i) => [
            'id' => $i->id,
            'name' => $i->name,
            'sku' => $i->sku,
            'current_stock' => (float) $i->current_stock,
            'minimum_stock' => (float) $i->minimum_stock,
            'maximum_stock' => (float) $i->maximum_stock,
            'is_low_stock' => (float) $i->current_stock <= (float) $i->minimum_stock,
            'unit' => $i->unit,
            'cost_per_unit' => (float) $i->cost_per_unit,
            'stock_value' => (float) $i->current_stock * (float) $i->cost_per_unit,
        ]);

        return $this->success([
            'items' => $data,
            'total_stock_value' => $data->sum('stock_value'),
        ]);
    }
}
