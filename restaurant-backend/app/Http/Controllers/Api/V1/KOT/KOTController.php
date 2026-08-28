<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\KOT;

use App\Http\Controllers\Controller;
use App\Models\KotTicket;
use App\Models\KotTicketItem;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KOTController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = KotTicket::with(['order.table', 'items']);

        // Archived tickets are hidden from the kitchen board unless
        // explicitly requested with ?archived=1.
        if ($request->boolean('archived')) {
            $query->whereNotNull('archived_at');
        } else {
            $query->whereNull('archived_at');
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($station = $request->input('station')) {
            $query->where('station', $station);
        }

        if ($priority = $request->input('priority')) {
            $query->where('priority', $priority);
        }

        $tickets = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $tickets->getCollection()->map(fn (KotTicket $t) => [
            'id' => $t->id,
            'kot_number' => $t->kot_number,
            'status' => $t->status,
            'priority' => $t->priority,
            'station' => $t->station,
            'estimated_minutes' => $t->estimated_minutes,
            'started_at' => $t->started_at?->toISOString(),
            'completed_at' => $t->completed_at?->toISOString(),
            'order' => $t->order ? [
                'id' => $t->order->id,
                'order_number' => $t->order->order_number,
                'table' => $t->order->table ? [
                    'number' => $t->order->table->number,
                ] : null,
            ] : null,
            'items_count' => $t->items->count(),
            'created_at' => $t->created_at?->toISOString(),
            'updated_at' => $t->updated_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $tickets->currentPage(),
                'last_page' => $tickets->lastPage(),
                'per_page' => $tickets->perPage(),
                'total' => $tickets->total(),
            ],
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $ticket = KotTicket::with(['order.table', 'order.customer', 'items.orderItem.menuItem'])
            ->find($id);

        if (!$ticket) {
            return $this->notFound('KOT ticket not found.');
        }

        return $this->success([
            'id' => $ticket->id,
            'kot_number' => $ticket->kot_number,
            'status' => $ticket->status,
            'priority' => $ticket->priority,
            'station' => $ticket->station,
            'estimated_minutes' => $ticket->estimated_minutes,
            'started_at' => $ticket->started_at?->toISOString(),
            'completed_at' => $ticket->completed_at?->toISOString(),
            'order' => $ticket->order ? [
                'id' => $ticket->order->id,
                'order_number' => $ticket->order->order_number,
                'table' => $ticket->order->table ? [
                    'number' => $ticket->order->table->number,
                ] : null,
                'customer' => $ticket->order->customer ? [
                    'name' => $ticket->order->customer->name,
                ] : null,
            ] : null,
            'items' => $ticket->items->map(fn (KotTicketItem $item) => [
                'id' => $item->id,
                'name' => $item->name,
                'quantity' => $item->quantity,
                'notes' => $item->notes,
                'status' => $item->status,
                'menu_item' => $item->orderItem?->menuItem ? [
                    'id' => $item->orderItem->menuItem->id,
                    'name' => $item->orderItem->menuItem->name,
                ] : null,
            ]),
            'created_at' => $ticket->created_at?->toISOString(),
            'updated_at' => $ticket->updated_at?->toISOString(),
        ]);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $ticket = KotTicket::find($id);

        if (!$ticket) {
            return $this->notFound('KOT ticket not found.');
        }

        $validated = $request->validate([
            // "received" is the created state used by the kitchen board.
            'status' => 'required|string|in:received,pending,in_progress,ready,completed,voided',
        ]);

        $data = ['status' => $validated['status']];

        if ($validated['status'] === 'in_progress') {
            $data['started_at'] = now();
        } elseif ($validated['status'] === 'completed' || $validated['status'] === 'ready') {
            $data['completed_at'] = now();
        }

        $ticket->update($data);

        // Keep the parent order in lockstep with the kitchen board:
        //   Start Preparing → order preparing
        //   Mark Ready      → order ready
        // (Serving stays a waiter action on the order itself.)
        if ($ticket->order) {
            $orderStatusMap = [
                'in_progress' => 'preparing',
                'ready' => 'ready',
                'completed' => 'ready',
            ];
            $nextOrderStatus = $orderStatusMap[$validated['status']] ?? null;

            if ($nextOrderStatus && ! in_array($ticket->order->status, ['completed', 'cancelled', 'voided'], true)) {
                \App\Models\Order::where('id', $ticket->order_id)->update(['status' => $nextOrderStatus]);
                \App\Models\OrderStatusHistory::create([
                    'order_id' => $ticket->order_id,
                    'status' => $nextOrderStatus,
                    'notes' => "Kitchen marked {$validated['status']} ({$ticket->kot_number})",
                    'changed_by' => $request->user()->id,
                ]);
            }
        }

        return $this->success([
            'id' => $ticket->id,
            'kot_number' => $ticket->kot_number,
            'status' => $ticket->status,
            'started_at' => $ticket->started_at?->toISOString(),
            'completed_at' => $ticket->completed_at?->toISOString(),
        ], 'KOT status updated successfully.');
    }

    /**
     * Archive a KOT ticket (soft-hide from the kitchen board; never deleted).
     *
     * Workflow safety: tickets still being prepared cannot be archived.
     */
    public function archive(Request $request, string $id): JsonResponse
    {
        $ticket = KotTicket::find($id);

        if (!$ticket) {
            return $this->notFound('KOT ticket not found.');
        }

        if (in_array($ticket->status, ['pending', 'in_progress'], true)) {
            return $this->error(
                'KOT tickets that are still pending or in progress cannot be archived.',
                409
            );
        }

        // Idempotent.
        if ($ticket->archived_at === null) {
            $ticket->update(['archived_at' => now()]);
        }

        return $this->success([
            'id' => $ticket->id,
            'kot_number' => $ticket->kot_number,
            'status' => $ticket->status,
            'archived_at' => $ticket->archived_at?->toISOString(),
        ], 'KOT ticket archived successfully.');
    }

    /**
     * Restore an archived KOT ticket (archived_at back to null).
     */
    public function unarchive(Request $request, string $id): JsonResponse
    {
        $ticket = KotTicket::find($id);

        if (!$ticket) {
            return $this->notFound('KOT ticket not found.');
        }

        $ticket->update(['archived_at' => null]);

        return $this->success([
            'id' => $ticket->id,
            'kot_number' => $ticket->kot_number,
            'status' => $ticket->status,
            'archived_at' => null,
        ], 'KOT ticket restored successfully.');
    }

    public function print(string $id): JsonResponse
    {
        $ticket = KotTicket::with(['order.table', 'items.orderItem.menuItem'])
            ->find($id);

        if (!$ticket) {
            return $this->notFound('KOT ticket not found.');
        }

        $ticket->update(['status' => 'in_progress', 'started_at' => now()]);

        return $this->success([
            'id' => $ticket->id,
            'kot_number' => $ticket->kot_number,
            'status' => $ticket->status,
            'print_data' => [
                'kot_number' => $ticket->kot_number,
                'order_number' => $ticket->order?->order_number,
                'table' => $ticket->order?->table?->number,
                'station' => $ticket->station,
                'priority' => $ticket->priority,
                'items' => $ticket->items->map(fn (KotTicketItem $item) => [
                    'name' => $item->name,
                    'quantity' => $item->quantity,
                    'notes' => $item->notes,
                ]),
                'printed_at' => now()->toISOString(),
            ],
        ], 'KOT printed successfully.');
    }

    public function void(Request $request, string $id): JsonResponse
    {
        $ticket = KotTicket::find($id);

        if (!$ticket) {
            return $this->notFound('KOT ticket not found.');
        }

        if ($ticket->status === 'completed' || $ticket->status === 'voided') {
            return $this->error('Cannot void a ' . $ticket->status . ' KOT.', 409);
        }

        $validated = $request->validate([
            'reason' => 'nullable|string|max:1000',
        ]);

        $ticket->update(['status' => 'voided']);
        $ticket->items()->update(['status' => 'voided']);

        return $this->success([
            'id' => $ticket->id,
            'kot_number' => $ticket->kot_number,
            'status' => $ticket->status,
        ], 'KOT voided successfully.');
    }

    public function reprint(string $id): JsonResponse
    {
        $ticket = KotTicket::with(['order.table', 'items.orderItem.menuItem'])
            ->find($id);

        if (!$ticket) {
            return $this->notFound('KOT ticket not found.');
        }

        return $this->success([
            'id' => $ticket->id,
            'kot_number' => $ticket->kot_number,
            'status' => $ticket->status,
            'print_data' => [
                'kot_number' => $ticket->kot_number,
                'order_number' => $ticket->order?->order_number,
                'table' => $ticket->order?->table?->number,
                'station' => $ticket->station,
                'priority' => $ticket->priority,
                'items' => $ticket->items->map(fn (KotTicketItem $item) => [
                    'name' => $item->name,
                    'quantity' => $item->quantity,
                    'notes' => $item->notes,
                ]),
                'printed_at' => now()->toISOString(),
                'reprinted' => true,
            ],
        ], 'KOT reprinted successfully.');
    }

    public function byStation(string $stationId): JsonResponse
    {
        $tickets = KotTicket::with(['order.table', 'items'])
            ->where('station', $stationId)
            ->whereNotIn('status', ['completed', 'voided'])
            ->orderBy('priority', 'desc')
            ->orderBy('created_at', 'asc')
            ->get();

        $data = $tickets->map(fn (KotTicket $t) => [
            'id' => $t->id,
            'kot_number' => $t->kot_number,
            'status' => $t->status,
            'priority' => $t->priority,
            'station' => $t->station,
            'estimated_minutes' => $t->estimated_minutes,
            'order' => $t->order ? [
                'id' => $t->order->id,
                'order_number' => $t->order->order_number,
                'table' => $t->order->table ? [
                    'number' => $t->order->table->number,
                ] : null,
            ] : null,
            'items' => $t->items->map(fn (KotTicketItem $item) => [
                'id' => $item->id,
                'name' => $item->name,
                'quantity' => $item->quantity,
                'notes' => $item->notes,
                'status' => $item->status,
            ]),
            'created_at' => $t->created_at?->toISOString(),
        ]);

        return $this->success(['items' => $data]);
    }
}
