<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Table;

use App\Http\Controllers\Controller;
use App\Models\Table;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TableController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Table::with('floorPlan');

        if ($floorPlanId = $request->input('floor_plan_id')) {
            $request->validate([
                'floor_plan_id' => 'uuid',
            ]);
            $query->where('floor_plan_id', $floorPlanId);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($search = $request->input('search')) {
            $query->where('number', 'ilike', "%{$search}%");
        }

        $tables = $query->orderBy('number')->get();

        $data = $tables->map(fn (Table $t) => [
            'id' => $t->id,
            'number' => $t->number,
            'capacity' => $t->capacity,
            'status' => $t->status,
            'shape' => $t->shape,
            'pos_x' => (float) $t->pos_x,
            'pos_y' => (float) $t->pos_y,
            'width' => (float) $t->width,
            'height' => (float) $t->height,
            'is_active' => $t->is_active,
            'floor_plan' => $t->floorPlan ? [
                'id' => $t->floorPlan->id,
                'name' => $t->floorPlan->name,
            ] : null,
            'created_at' => $t->created_at?->toISOString(),
            'updated_at' => $t->updated_at?->toISOString(),
        ]);

        return $this->success(['items' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'floor_plan_id' => ['required','uuid','exists:floor_plans,id'],
            'number' => 'required|string|max:50',
            'capacity' => 'required|integer|min:1',
            'status' => 'sometimes|string|in:available,occupied,reserved,maintenance,needs_cleaning',
            'shape' => 'sometimes|string|in:rectangle,circle,square',
            'pos_x' => 'required|numeric|min:0',
            'pos_y' => 'required|numeric|min:0',
            'width' => 'required|numeric|min:1',
            'height' => 'required|numeric|min:1',
            'is_active' => 'sometimes|boolean',
        ]);

        $exists = Table::where('floor_plan_id', $validated['floor_plan_id'])
            ->where('number', $validated['number'])
            ->exists();

        if ($exists) {
            return $this->error('Table number already exists in this floor plan.', 409);
        }

        $table = Table::create($validated);

        return $this->created([
            'id' => $table->id,
            'number' => $table->number,
            'capacity' => $table->capacity,
            'status' => $table->status,
            'shape' => $table->shape,
            'pos_x' => (float) $table->pos_x,
            'pos_y' => (float) $table->pos_y,
            'width' => (float) $table->width,
            'height' => (float) $table->height,
            'is_active' => $table->is_active,
            'floor_plan_id' => $table->floor_plan_id,
            'created_at' => $table->created_at?->toISOString(),
            'updated_at' => $table->updated_at?->toISOString(),
        ], 'Table created successfully.');
    }

    public function show(string $id): JsonResponse
    {
        $table = Table::with('floorPlan')->find($id);

        if (!$table) {
            return $this->notFound('Table not found.');
        }

        return $this->success([
            'id' => $table->id,
            'number' => $table->number,
            'capacity' => $table->capacity,
            'status' => $table->status,
            'shape' => $table->shape,
            'pos_x' => (float) $table->pos_x,
            'pos_y' => (float) $table->pos_y,
            'width' => (float) $table->width,
            'height' => (float) $table->height,
            'is_active' => $table->is_active,
            'floor_plan' => $table->floorPlan ? [
                'id' => $table->floorPlan->id,
                'name' => $table->floorPlan->name,
            ] : null,
            'created_at' => $table->created_at?->toISOString(),
            'updated_at' => $table->updated_at?->toISOString(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $table = Table::find($id);

        if (!$table) {
            return $this->notFound('Table not found.');
        }

        $validated = $request->validate([
            'floor_plan_id' => ['sometimes','uuid','exists:floor_plans,id'],
            'number' => 'sometimes|string|max:50',
            'capacity' => 'sometimes|integer|min:1',
            'status' => 'sometimes|string|in:available,occupied,reserved,maintenance,needs_cleaning',
            'shape' => 'sometimes|string|in:rectangle,circle,square',
            'pos_x' => 'sometimes|numeric|min:0',
            'pos_y' => 'sometimes|numeric|min:0',
            'width' => 'sometimes|numeric|min:1',
            'height' => 'sometimes|numeric|min:1',
            'is_active' => 'sometimes|boolean',
        ]);

        if (isset($validated['number']) && isset($validated['floor_plan_id'])) {
            $exists = Table::where('floor_plan_id', $validated['floor_plan_id'])
                ->where('number', $validated['number'])
                ->where('id', '!=', $id)
                ->exists();
            if ($exists) {
                return $this->error('Table number already exists in this floor plan.', 409);
            }
        }

        $table->update($validated);

        return $this->success([
            'id' => $table->id,
            'number' => $table->number,
            'capacity' => $table->capacity,
            'status' => $table->status,
            'shape' => $table->shape,
            'pos_x' => (float) $table->pos_x,
            'pos_y' => (float) $table->pos_y,
            'width' => (float) $table->width,
            'height' => (float) $table->height,
            'is_active' => $table->is_active,
            'floor_plan_id' => $table->floor_plan_id,
            'created_at' => $table->created_at?->toISOString(),
            'updated_at' => $table->updated_at?->toISOString(),
        ], 'Table updated successfully.');
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $table = Table::find($id);

        if (!$table) {
            return $this->notFound('Table not found.');
        }

        $validated = $request->validate([
            'status' => 'required|string|in:available,occupied,reserved,maintenance',
        ]);

        $table->update(['status' => $validated['status']]);

        return $this->success([
            'id' => $table->id,
            'number' => $table->number,
            'status' => $table->status,
        ], 'Table status updated successfully.');
    }

    public function merge(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'table_ids' => 'required|array|min:2',
            'table_ids.*' => ['required','uuid','exists:tables,id'],
        ]);

        $tables = Table::whereIn('id', $validated['table_ids'])->get();

        if ($tables->count() !== count($validated['table_ids'])) {
            return $this->notFound('One or more tables not found.');
        }

        $occupied = $tables->where('status', '!=', 'available');
        if ($occupied->isNotEmpty()) {
            return $this->error('All tables must be available to merge.', 409);
        }

        $totalCapacity = $tables->sum('capacity');
        $primaryTable = $tables->first();

        $primaryTable->update([
            'capacity' => $totalCapacity,
            'status' => 'occupied',
        ]);

        $tables->slice(1)->each(fn ($t) => $t->update([
            'status' => 'maintenance',
            'is_active' => false,
        ]));

        return $this->success([
            'merged_table' => [
                'id' => $primaryTable->id,
                'number' => $primaryTable->number,
                'capacity' => $primaryTable->capacity,
                'status' => $primaryTable->status,
            ],
            'merged_tables' => $tables->slice(1)->pluck('id'),
        ], 'Tables merged successfully.');
    }

    public function split(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'table_id' => ['required','uuid','exists:tables,id'],
        ]);

        $table = Table::find($validated['table_id']);

        if ($table->status !== 'occupied') {
            return $this->error('Table is not occupied.', 409);
        }

        $mergedTables = Table::where('is_active', false)
            ->where('status', 'maintenance')
            ->where('floor_plan_id', $table->floor_plan_id)
            ->get();

        if ($mergedTables->isEmpty()) {
            $table->update(['status' => 'available']);
            return $this->success([
                'table' => [
                    'id' => $table->id,
                    'number' => $table->number,
                    'status' => 'available',
                ],
                'restored_tables' => [],
            ], 'Table released (no merged tables to restore).');
        }

        $mergedTables->each(fn ($t) => $t->update([
            'capacity' => (int) ceil($table->capacity / ($mergedTables->count() + 1)),
            'status' => 'available',
            'is_active' => true,
        ]));

        $table->update([
            'capacity' => (int) ceil($table->capacity / ($mergedTables->count() + 1)),
            'status' => 'available',
        ]);

        return $this->success([
            'table' => [
                'id' => $table->id,
                'number' => $table->number,
                'status' => 'available',
            ],
            'restored_tables' => $mergedTables->pluck('id'),
        ], 'Tables split successfully.');
    }

    public function transfer(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from_table_id' => ['required','uuid','exists:tables,id'],
            'to_table_id' => ['required','uuid','exists:tables,id','different:from_table_id'],
        ]);

        $fromTable = Table::find($validated['from_table_id']);
        $toTable = Table::find($validated['to_table_id']);

        if ($fromTable->status !== 'occupied') {
            return $this->error('Source table is not occupied.', 409);
        }

        if ($toTable->status !== 'available') {
            return $this->error('Destination table is not available.', 409);
        }

        $toTable->update(['status' => 'occupied']);
        $fromTable->update(['status' => 'available']);

        return $this->success([
            'from_table' => [
                'id' => $fromTable->id,
                'number' => $fromTable->number,
                'status' => 'available',
            ],
            'to_table' => [
                'id' => $toTable->id,
                'number' => $toTable->number,
                'status' => 'occupied',
            ],
        ], 'Table transferred successfully.');
    }
}
