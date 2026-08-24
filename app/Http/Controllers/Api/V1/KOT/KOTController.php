<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\KOT;

use App\Http\Controllers\Controller;
use App\Models\KotTicket;
use App\Models\KotTicketItem;
use App\Models\OrderStatusHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KOTController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = KotTicket::with(['order.table', 'items']);

        if ($request->boolean('archived')) {
            $query->archived();
        } else {
            $query->notArchived();
        }

        if ($status = $request->input('status')) {
            $statuses = array_values(array_filter(array_map('trim', explode(',', $status))));
            if (! empty($statuses)) {
                $query->whereIn('status', $statuses);
            }
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
            // Alias matching the frontend KotTicket type field name.
            'estimated_time' => $t->estimated_minutes,
            'started_at' => $t->started_at?->toISOString(),
            'completed_at' => $t->completed_at?->toISOString(),
            'order' => $t->order ? [
                'id' => $t->order->id,
                'order_number' => $t->order->order_number,
                'order_type' => $t->order->order_type,
                'notes' => $t->order->notes,
                'table' => $t->order->table ? [
                    'number' => $t->order->table->number,
                ] : null,
            ] : null,
            'items' => $t->items->map(fn (KotTicketItem $item) => [
                'id' => $item->id,
                'name' => $item->name,
                'quantity' => $item->quantity,
                'status' => $item->status,
                'notes' => $item->notes,
            ]),
            'items_count' => $t->items->count(),
            'archived_at' => $t->archived_at?->toISOString(),
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

        if (! $ticket) {
            return $this->notFound('KOT ticket not found.');
        }

        return $this->success([
            'id' => $ticket->id,
            'kot_number' => $ticket->kot_number,
            'status' => $ticket->status,
            'priority' => $ticket->priority,
            'station' => $ticket->station,
            'estimated_minutes' => $ticket->estimated_minutes,
            // Alias matching the frontend KotTicket type field name.
            'estimated_time' => $ticket->estimated_minutes,
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
            'archived_at' => $ticket->archived_at?->toISOString(),
            'created_at' => $ticket->created_at?->toISOString(),
            'updated_at' => $ticket->updated_at?->toISOString(),
        ]);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $ticket = KotTicket::find($id);

        if (! $ticket) {
            return $this->notFound('KOT ticket not found.');
        }

        $validated = $request->validate([
            'status' => 'required|string|in:received,in_progress,ready,completed,voided',
        ]);

        if (! $ticket->canTransitionTo($validated['status'])) {
            return $this->error(
                "Invalid KOT status transition from {$ticket->status} to {$validated['status']}.",
                409
            );
        }

        $data = ['status' => $validated['status']];

        if ($validated['status'] === 'in_progress') {
            $data['started_at'] = now();
        } elseif ($validated['status'] === 'completed') {
            $data['completed_at'] = now();
        }

        $ticket->update($data);

        // When the kitchen finishes a ticket, reflect it on the parent order.
        if (in_array($validated['status'], ['ready', 'completed'], true)) {
            $ticket->items()->update(['status' => 'ready']);

            $order = $ticket->order;
            if ($order && in_array($order->status, ['confirmed', 'preparing'], true)) {
                $allItemsDone = ! KotTicketItem::whereHas('kotTicket', function ($query) use ($order) {
                    $query->where('order_id', $order->id);
                })->whereNotIn('status', ['ready', 'completed', 'voided'])->exists();

                if ($allItemsDone) {
                    $order->update(['status' => 'ready']);
                    OrderStatusHistory::create([
                        'order_id' => $order->id,
                        'status' => 'ready',
                        'notes' => 'All KOT items ready',
                        'changed_by' => $request->user()?->id,
                    ]);
                }
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

    public function archive(string $id): JsonResponse
    {
        $ticket = KotTicket::find($id);

        if (! $ticket) {
            return $this->notFound('KOT ticket not found.');
        }

        if (! in_array($ticket->status, ['ready', 'completed'], true)) {
            return $this->error(
                "Only ready or completed KOTs can be archived. Current status: {$ticket->status}.",
                409
            );
        }

        if ($ticket->archived_at) {
            return $this->success([
                'id' => $ticket->id,
                'kot_number' => $ticket->kot_number,
                'status' => $ticket->status,
                'archived_at' => $ticket->archived_at?->toISOString(),
            ], 'KOT already archived.');
        }

        $ticket->update(['archived_at' => now()]);

        return $this->success([
            'id' => $ticket->id,
            'kot_number' => $ticket->kot_number,
            'status' => $ticket->status,
            'archived_at' => $ticket->archived_at?->toISOString(),
        ], 'KOT archived successfully.');
    }

    public function print(string $id): JsonResponse
    {
        $ticket = KotTicket::with(['order.table', 'items.orderItem.menuItem'])
            ->find($id);

        if (! $ticket) {
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

        if (! $ticket) {
            return $this->notFound('KOT ticket not found.');
        }

        if ($ticket->status === 'completed' || $ticket->status === 'voided') {
            return $this->error('Cannot void a '.$ticket->status.' KOT.', 409);
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

        if (! $ticket) {
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
