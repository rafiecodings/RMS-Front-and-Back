<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Ingredient;
use App\Models\StockMovement;
use App\Models\Wastage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WastageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Wastage::with(['ingredient', 'reporter']);

        if ($ingredientId = $request->input('ingredient_id')) {
            $query->where('ingredient_id', $ingredientId);
        }

        if ($date = $request->input('date')) {
            $query->whereDate('created_at', $date);
        }

        $wastages = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $wastages->getCollection()->map(fn (Wastage $w) => [
            'id' => $w->id,
            'quantity' => (float) $w->quantity,
            'reason' => $w->reason,
            'notes' => $w->notes,
            'ingredient' => $w->ingredient ? [
                'id' => $w->ingredient->id,
                'name' => $w->ingredient->name,
                'unit' => $w->ingredient->unit,
                'cost_per_unit' => (float) $w->ingredient->cost_per_unit,
                'total_cost' => (float) $w->quantity * (float) $w->ingredient->cost_per_unit,
            ] : null,
            'reporter' => $w->reporter ? [
                'name' => $w->reporter->name,
            ] : null,
            'created_at' => $w->created_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $wastages->currentPage(),
                'last_page' => $wastages->lastPage(),
                'per_page' => $wastages->perPage(),
                'total' => $wastages->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ingredient_id' => 'required|string|exists:ingredients,id',
            'quantity' => 'required|numeric|min:0.001',
            'reason' => 'required|string|max:500',
            'notes' => 'nullable|string|max:1000',
        ]);

        $result = DB::transaction(function () use ($validated, $request) {
            $ingredient = Ingredient::find($validated['ingredient_id']);

            if ((float) $ingredient->current_stock < $validated['quantity']) {
                return ['error' => 'Insufficient stock for wastage recording.'];
            }

            $ingredient->decrement('current_stock', $validated['quantity']);

            $wastage = Wastage::create([
                ...$validated,
                'reported_by' => $request->user()->id,
            ]);

            StockMovement::create([
                'ingredient_id' => $validated['ingredient_id'],
                'type' => 'outward',
                'quantity' => $validated['quantity'],
                'unit_cost' => (float) $ingredient->cost_per_unit,
                'notes' => "Wastage: {$validated['reason']}",
                'created_by' => $request->user()->id,
            ]);

            return ['wastage' => $wastage, 'ingredient' => $ingredient];
        });

        if (isset($result['error'])) {
            return $this->error($result['error'], 422);
        }

        \App\Services\AuditLogger::record('wastage_recorded', $result['wastage'], [
            'description' => "Wastage recorded: {$result['ingredient']->name} ({$validated['quantity']}): {$validated['reason']}",
            'quantity' => (float) $validated['quantity'],
        ]);

        return $this->created([
            'id' => $result['wastage']->id,
            'quantity' => (float) $result['wastage']->quantity,
            'reason' => $result['wastage']->reason,
            'notes' => $result['wastage']->notes,
            'ingredient' => [
                'id' => $result['ingredient']->id,
                'name' => $result['ingredient']->name,
                'current_stock' => (float) $result['ingredient']->current_stock,
            ],
            'created_at' => $result['wastage']->created_at?->toISOString(),
        ], 'Wastage recorded successfully.');
    }
}
