<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Table;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Table;
use App\Services\ReservationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReservationController extends Controller
{
    protected ReservationService $reservationService;

    public function __construct(ReservationService $reservationService)
    {
        $this->reservationService = $reservationService;
    }

    /**
     * Default reservation duration in minutes, used for time-window overlap detection.
     */
    protected const DEFAULT_DURATION = 120;

    public function index(Request $request): JsonResponse
    {
        $query = Reservation::with(['customer', 'table']);

        if ($request->boolean('archived')) {
            $query->archived();
        } else {
            $query->notArchived();
        }

        if ($date = $request->input('date')) {
            $query->whereDate('reservation_date', $date);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('guest_name', 'ilike', "%{$search}%")
                    ->orWhere('guest_phone', 'ilike', "%{$search}%")
                    ->orWhere('reservation_number', 'ilike', "%{$search}%");
            });
        }

        $reservations = $query->orderBy('reservation_date', 'desc')
            ->orderBy('reservation_time', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $reservations->getCollection()->map(fn (Reservation $r) => [
            'id' => $r->id,
            'reservation_number' => $r->reservation_number,
            'guest_name' => $r->guest_name,
            'guest_phone' => $r->guest_phone,
            'guest_email' => $r->guest_email,
            'customer_id' => $r->customer_id,
            'table_id' => $r->table_id,
            'party_size' => $r->party_size,
            'reservation_date' => $r->reservation_date?->toDateString(),
            'reservation_time' => $r->reservation_time,
            'status' => $r->status,
            'source' => $r->source,
            'special_requests' => $r->special_requests,
            'customer' => $r->customer ? [
                'id' => $r->customer->id,
                'name' => $r->customer->name,
            ] : null,
            'table' => $r->table ? [
                'id' => $r->table->id,
                'number' => $r->table->number,
            ] : null,
            'created_at' => $r->created_at?->toISOString(),
            'updated_at' => $r->updated_at?->toISOString(),
            'archived_at' => $r->archived_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $reservations->currentPage(),
                'last_page' => $reservations->lastPage(),
                'per_page' => $reservations->perPage(),
                'total' => $reservations->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'table_id' => 'nullable|exists:tables,id',
            'guest_name' => 'required|string|max:255',
            'guest_phone' => 'nullable|string|max:50',
            'guest_email' => 'nullable|email|max:255',
            'party_size' => 'required|integer|min:1',
            'reservation_date' => 'required|date|after_or_equal:today',
            'reservation_time' => 'required|date_format:H:i',
            'source' => 'sometimes|string|in:phone,online,walk_in,app',
            'special_requests' => 'nullable|string|max:2000',
        ]);

        $validated['reservation_number'] = 'RES-' . strtoupper(uniqid());
        $validated['status'] = 'pending';

        // Pre-check: table conflicts before mutating anything
        if (isset($validated['table_id'])) {
            $error = $this->reservationService->validateTableAssignment(
                $validated['table_id'],
                $validated['reservation_date'],
                $validated['reservation_time'],
                null,
                $validated['party_size']
            );
            if ($error) {
                return $this->error($error, 409);
            }
        }

        $reservation = DB::transaction(function () use ($validated) {
            if (isset($validated['table_id'])) {
                Table::where('id', $validated['table_id'])
                    ->where('status', 'available')
                    ->update(['status' => 'reserved']);
            }

            $result = Reservation::create($validated);
            $result->load(['customer', 'table']);

            return $result;
        });

        return $this->created($this->format($reservation), 'Reservation created successfully.');
    }

    public function calendar(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->endOfMonth()->toDateString());

        $reservations = Reservation::with(['customer', 'table'])
            ->whereBetween('reservation_date', [$startDate, $endDate])
            ->whereNotIn('status', ['cancelled'])
            ->orderBy('reservation_date')
            ->orderBy('reservation_time')
            ->get();

        $data = $reservations->map(fn (Reservation $r) => [
            'id' => $r->id,
            'reservation_number' => $r->reservation_number,
            'guest_name' => $r->guest_name,
            'party_size' => $r->party_size,
            'reservation_date' => $r->reservation_date?->toDateString(),
            'reservation_time' => $r->reservation_time,
            'status' => $r->status,
            'table' => $r->table ? [
                'id' => $r->table->id,
                'number' => $r->table->number,
            ] : null,
            'customer' => $r->customer ? [
                'id' => $r->customer->id,
                'name' => $r->customer->name,
            ] : null,
        ]);

        return $this->success(['items' => $data]);
    }

    public function show(string $id): JsonResponse
    {
        $reservation = Reservation::with(['customer', 'table'])->find($id);

        if (! $reservation) {
            return $this->notFound('Reservation not found.');
        }

        return $this->success([
            'id' => $reservation->id,
            'reservation_number' => $reservation->reservation_number,
            'guest_name' => $reservation->guest_name,
            'guest_phone' => $reservation->guest_phone,
            'guest_email' => $reservation->guest_email,
            'customer_id' => $reservation->customer_id,
            'table_id' => $reservation->table_id,
            'party_size' => $reservation->party_size,
            'reservation_date' => $reservation->reservation_date?->toDateString(),
            'reservation_time' => $reservation->reservation_time,
            'status' => $reservation->status,
            'source' => $reservation->source,
            'special_requests' => $reservation->special_requests,
            'cancellation_reason' => $reservation->cancellation_reason,
            'customer' => $reservation->customer ? [
                'id' => $reservation->customer->id,
                'name' => $reservation->customer->name,
                'phone' => $reservation->customer->phone,
            ] : null,
            'table' => $reservation->table ? [
                'id' => $reservation->table->id,
                'number' => $reservation->table->number,
                'capacity' => $reservation->table->capacity,
            ] : null,
            'created_at' => $reservation->created_at?->toISOString(),
            'updated_at' => $reservation->updated_at?->toISOString(),
            'archived_at' => $reservation->archived_at?->toISOString(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $reservation = Reservation::find($id);

        if (! $reservation) {
            return $this->notFound('Reservation not found.');
        }

        if (in_array($reservation->status, ['completed', 'cancelled'])) {
            return $this->error('Cannot modify a reservation with status: ' . $reservation->status, 409);
        }

        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'table_id' => 'nullable|exists:tables,id',
            'guest_name' => 'sometimes|string|max:255',
            'guest_phone' => 'nullable|string|max:50',
            'guest_email' => 'nullable|email|max:255',
            'party_size' => 'sometimes|integer|min:1',
            'reservation_date' => 'sometimes|date|after_or_equal:today',
            'reservation_time' => 'sometimes|date_format:H:i',
            'source' => 'sometimes|string|in:phone,online,walk_in,app',
            'special_requests' => 'nullable|string|max:2000',
        ]);

        // Determine the effective scheduling fields after this update
        $effectiveTableId = $validated['table_id'] ?? $reservation->table_id;
        $effectiveDate = isset($validated['reservation_date'])
            ? $validated['reservation_date']
            : ($reservation->reservation_date?->toDateString() ?? date('Y-m-d'));
        $effectiveTime = $validated['reservation_time'] ?? $reservation->reservation_time;

        // Run conflict detection if any scheduling-relevant field changed
        $tableChanged = isset($validated['table_id']) && $validated['table_id'] !== $reservation->table_id;
        $dateChanged = isset($validated['reservation_date']);
        $timeChanged = isset($validated['reservation_time']);
        $partySizeChanged = isset($validated['party_size'])
            && (int) $validated['party_size'] !== (int) $reservation->party_size;

        if ($effectiveTableId && ($tableChanged || $dateChanged || $timeChanged || $partySizeChanged)) {
            $error = $this->reservationService->validateTableAssignment(
                $effectiveTableId,
                $effectiveDate,
                $effectiveTime,
                $reservation->id,
                $validated['party_size'] ?? null
            );
            if ($error) {
                return $this->error($error, 409);
            }
        }

        $updated = DB::transaction(function () use ($reservation, $validated, $tableChanged) {
            // Free the old table if it was reserved and we are switching tables
            if ($tableChanged && $reservation->table_id) {
                Table::where('id', $reservation->table_id)
                    ->where('status', 'reserved')
                    ->update(['status' => 'available']);
            }

            $reservation->update($validated);

            // Mark new table as reserved if a new table is assigned/changed
            if ($tableChanged && isset($validated['table_id'])) {
                Table::where('id', $validated['table_id'])
                    ->where('status', 'available')
                    ->update(['status' => 'reserved']);
            }

            $reservation->load(['customer', 'table']);

            return $reservation;
        });

        return $this->success($this->format($updated), 'Reservation updated successfully.');
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $reservation = Reservation::find($id);

        if (! $reservation) {
            return $this->notFound('Reservation not found.');
        }

        $validated = $request->validate([
            'status' => 'required|string|in:pending,confirmed,seated,completed,cancelled,no_show',
            'cancellation_reason' => 'nullable|string|max:1000',
        ]);

        if (in_array($validated['status'], ['cancelled', 'no_show']) && empty($validated['cancellation_reason'])) {
            return $this->error('Cancellation reason is required.', 422);
        }

        // Idempotent no-op: setting the same status twice succeeds without
        // re-running table sync or transition checks.
        if ($validated['status'] === $reservation->status) {
            return $this->success([
                'id' => $reservation->id,
                'reservation_number' => $reservation->reservation_number,
                'status' => $reservation->status,
            ], 'Reservation status unchanged.');
        }

        // Terminal states have no outgoing transitions.
        if (in_array($reservation->status, ['completed', 'cancelled', 'no_show'])) {
            return $this->error(
                'Cannot change status of a reservation with status: ' . $reservation->status,
                409
            );
        }

        $updated = DB::transaction(function () use ($reservation, $validated) {
            $reservation->update($validated);

            if ($reservation->table_id) {
                $this->reservationService->syncTableStatus($reservation->table_id, $validated['status']);
            }

            return $reservation;
        });

        return $this->success([
            'id' => $updated->id,
            'reservation_number' => $updated->reservation_number,
            'status' => $updated->status,
        ], 'Reservation status updated successfully.');
    }

    /**
     * Format a reservation model for API output.
     */
    protected function format(Reservation $r): array
    {
        return [
            'id' => $r->id,
            'reservation_number' => $r->reservation_number,
            'guest_name' => $r->guest_name,
            'guest_phone' => $r->guest_phone,
            'guest_email' => $r->guest_email,
            'customer_id' => $r->customer_id,
            'table_id' => $r->table_id,
            'party_size' => $r->party_size,
            'reservation_date' => $r->reservation_date?->toDateString(),
            'reservation_time' => $r->reservation_time,
            'status' => $r->status,
            'source' => $r->source,
            'special_requests' => $r->special_requests,
            'customer' => $r->customer ? [
                'id' => $r->customer->id,
                'name' => $r->customer->name,
            ] : null,
            'table' => $r->table ? [
                'id' => $r->table->id,
                'number' => $r->table->number,
            ] : null,
            'created_at' => $r->created_at?->toISOString(),
            'updated_at' => $r->updated_at?->toISOString(),
            'archived_at' => $r->archived_at?->toISOString(),
        ];
    }

    public function archive(string $id): JsonResponse
    {
        $reservation = Reservation::find($id);

        if (! $reservation) {
            return $this->notFound('Reservation not found.');
        }

        if (! in_array($reservation->status, [
            Reservation::STATUS_COMPLETED,
            Reservation::STATUS_CANCELLED,
        ])) {
            return $this->error(
                'Only completed or cancelled reservations can be archived.',
                422
            );
        }

        if ($reservation->archived_at) {
            return $this->success(
                $this->format($reservation),
                'Reservation is already archived.'
            );
        }

        $reservation->update(['archived_at' => now()]);
        $reservation->load(['customer', 'table']);

        return $this->success(
            $this->format($reservation),
            'Reservation archived successfully.'
        );
    }
}
