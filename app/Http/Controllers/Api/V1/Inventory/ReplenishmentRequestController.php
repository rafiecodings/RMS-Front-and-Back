<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Ingredient;
use App\Models\ReplenishmentRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Replenishment Requests — lightweight restock requests for restaurant
 * inventory. Deliberately NOT procurement: no suppliers, no purchasing.
 */
class ReplenishmentRequestController extends Controller
{
    /** Valid status transitions (target => allowed source statuses). */
    private const TRANSITIONS = [
        'submitted' => ['draft'],
        'approved' => ['submitted'],
        'processing' => ['approved'],
        'fulfilled' => ['processing'],
        'rejected' => ['submitted'],
        'cancelled' => ['draft', 'submitted'],
    ];

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'nullable|string|in:draft,submitted,approved,processing,fulfilled,rejected,cancelled',
            'priority' => 'nullable|string|in:low,normal,high,urgent',
            'ingredient_id' => 'nullable|uuid',
            'search' => 'nullable|string|max:100',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = ReplenishmentRequest::with(['ingredient', 'requester']);

        if ($status = $validated['status'] ?? null) {
            $query->where('status', $status);
        }

        if ($priority = $validated['priority'] ?? null) {
            $query->where('priority', $priority);
        }

        if ($ingredientId = $validated['ingredient_id'] ?? null) {
            $query->where('ingredient_id', $ingredientId);
        }

        if ($search = $validated['search'] ?? null) {
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(request_number) LIKE ?', ['%'.strtolower($search).'%'])
                    ->orWhereHas('ingredient', fn ($iq) => $iq->whereRaw('LOWER(name) LIKE ?', ['%'.strtolower($search).'%']));
            });
        }

        $requests = $query
            ->orderByRaw("CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END")
            ->orderByDesc('created_at')
            ->paginate($validated['per_page'] ?? 15);

        $data = $requests->getCollection()->map(fn (ReplenishmentRequest $r) => $this->mapRow($r));

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $requests->currentPage(),
                'last_page' => $requests->lastPage(),
                'per_page' => $requests->perPage(),
                'total' => $requests->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ingredient_id' => 'required|uuid|exists:ingredients,id',
            'quantity' => 'required|numeric|min:0.001',
            'unit' => 'nullable|string|max:20',
            'priority' => 'nullable|string|in:low,normal,high,urgent',
            'notes' => 'nullable|string|max:1000',
            'status' => 'nullable|string|in:draft,submitted',
        ]);

        $ingredient = Ingredient::find($validated['ingredient_id']);

        $payload = [
            'request_number' => $this->nextRequestNumber(),
            'ingredient_id' => $validated['ingredient_id'],
            'quantity' => $validated['quantity'],
            'unit' => $validated['unit'] ?? $ingredient?->unit,
            'priority' => $validated['priority'] ?? 'normal',
            // Default to submitted unless explicitly saved as a draft — a
            // replenishment request is meant to be sent, not hoarded.
            'status' => $validated['status'] ?? 'submitted',
            'requested_by' => $request->user()->id,
            'notes' => $validated['notes'] ?? null,
        ];

        $replenishment = DB::transaction(fn () => ReplenishmentRequest::create($payload));

        return $this->created($this->mapRow($replenishment->load(['ingredient', 'requester'])), 'Replenishment request created successfully.');
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $replenishment = ReplenishmentRequest::find($id);

        if (!$replenishment) {
            return $this->notFound('Replenishment request not found.');
        }

        $validated = $request->validate([
            'status' => 'required|string|in:'.implode(',', array_keys(self::TRANSITIONS)),
        ]);

        $target = $validated['status'];
        $allowed = self::TRANSITIONS[$target] ?? [];

        if ($request->user()->hasRole('inventory_staff')) {
            if ($target !== 'submitted' || $replenishment->requested_by !== $request->user()->id) {
                return $this->error(
                    'Inventory Staff may only submit their own draft replenishment requests.',
                    403
                );
            }
        }

        if (! in_array($replenishment->status, $allowed, true)) {
            return $this->error(
                "Cannot move a {$replenishment->status} request to {$target}.",
                409
            );
        }

        $replenishment->update(['status' => $target]);

        return $this->success($this->mapRow($replenishment->load(['ingredient', 'requester'])), 'Replenishment request updated.');
    }

    public function destroy(string $id): JsonResponse
    {
        $replenishment = ReplenishmentRequest::find($id);

        if (!$replenishment) {
            return $this->notFound('Replenishment request not found.');
        }

        if (! in_array($replenishment->status, ['draft', 'rejected', 'cancelled'], true)) {
            return $this->error(
                'Only draft, rejected or cancelled requests can be deleted.',
                409
            );
        }

        $replenishment->delete();

        return $this->noContent();
    }

    private function mapRow(ReplenishmentRequest $r): array
    {
        return [
            'id' => $r->id,
            'request_number' => $r->request_number,
            'ingredient_id' => $r->ingredient_id,
            'ingredient' => $r->ingredient ? [
                'id' => $r->ingredient->id,
                'name' => $r->ingredient->name,
                'unit' => $r->ingredient->unit,
                'current_stock' => (float) $r->ingredient->current_stock,
                'minimum_stock' => (float) $r->ingredient->minimum_stock,
            ] : null,
            'quantity' => (float) $r->quantity,
            'unit' => $r->unit,
            'priority' => $r->priority,
            'status' => $r->status,
            'requested_by' => $r->requested_by,
            'requester' => $r->requester ? [
                'id' => $r->requester->id,
                'name' => $r->requester->name,
            ] : null,
            'notes' => $r->notes,
            'created_at' => $r->created_at?->toISOString(),
            'updated_at' => $r->updated_at?->toISOString(),
        ];
    }

    /** Human-readable sequential number: RPL-YYYYMMDD-### */
    private function nextRequestNumber(): string
    {
        $prefix = 'RPL-'.now()->format('Ymd');
        $countToday = ReplenishmentRequest::withTrashed()
            ->whereDate('created_at', today())
            ->count() + 1;

        return sprintf('%s-%03d', $prefix, $countToday);
    }
}
