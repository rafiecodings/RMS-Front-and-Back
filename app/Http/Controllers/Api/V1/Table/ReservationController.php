<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Table;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Customer;
use App\Models\Table;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReservationController extends Controller
{
    private const BLOCKING_STATUSES = ['pending', 'confirmed'];

    private function overlapsActiveReservation(
        string $tableId,
        string $date,
        string $time,
        ?string $excludeId = null
    ): bool {
        $windowMinutes = (int) config('app.reservation_window_minutes', 90);
        // Normalize: callers may pass a full ISO datetime; only the date part is relevant here.
        $date = Carbon::parse($date)->toDateString();
        $slotStart = Carbon::parse("{$date} {$time}");
        $slotEnd = $slotStart->copy()->addMinutes($windowMinutes);

        $query = Reservation::where('table_id', $tableId)
            ->whereIn('status', self::BLOCKING_STATUSES)
            ->whereDate('reservation_date', $date);

        if ($excludeId !== null) {
            $query->where('id', '!=', $excludeId);
        }

        foreach ($query->get() as $reservation) {
            if (! $reservation->reservation_time) {
                continue;
            }
            $resStart = Carbon::parse(
                $reservation->reservation_date->toDateString().' '.$reservation->reservation_time
            );
            $resEnd = $resStart->copy()->addMinutes($windowMinutes);

            if ($slotStart->lt($resEnd) && $resStart->lt($slotEnd)) {
                return true;
            }
        }

        return false;
    }
    public function index(Request $request): JsonResponse
    {
        $query = Reservation::with(['customer', 'table']);

        // Archived reservations are hidden unless ?archived=1 (the frontend
        // "Archived" view scope sends this flag).
        if ($request->boolean('archived')) {
            $query->whereNotNull('archived_at');
        } else {
            $query->whereNull('archived_at');
        }

        if ($date = $request->input('date')) {
            $query->whereDate('reservation_date', $date);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(guest_name) LIKE ?', ["%".strtolower($search)."%"])
                    ->orWhereRaw('LOWER(guest_phone) LIKE ?', ["%".strtolower($search)."%"])
                    ->orWhereRaw('LOWER(reservation_number) LIKE ?', ["%".strtolower($search)."%"]);
            });
        }

        $reservations = $query->orderBy('reservation_date', 'desc')
            ->orderBy('reservation_time', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $reservations->getCollection()->map(fn (Reservation $r) => [
            'id' => $r->id,
            'customer_id' => $r->customer_id,
            'table_id' => $r->table_id,
            'reservation_number' => $r->reservation_number,
            'guest_name' => $r->guest_name,
            'guest_phone' => $r->guest_phone,
            'guest_email' => $r->guest_email,
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
            'guest_name' => 'nullable|required_without:customer_id|string|max:255',
            'guest_phone' => 'nullable|required_without:customer_id|string|max:50',
            'guest_email' => 'nullable|email|max:255',
            'party_size' => 'required|integer|min:1',
            'reservation_date' => 'required|date|after_or_equal:today',
            'reservation_time' => 'required|date_format:H:i',
            'source' => 'sometimes|string|in:phone,online,walk_in,app',
            'special_requests' => 'nullable|string|max:2000',
        ]);

        // Normalize to a pure date: clients may send an ISO datetime (date+T+time).
        $validated['reservation_date'] = Carbon::parse($validated['reservation_date'])->toDateString();

        if (! empty($validated['customer_id'])) {
            $customer = Customer::where('is_active', true)->find($validated['customer_id']);
            if (! $customer) {
                return $this->error('Select an active registered customer.', 422);
            }
            $validated['guest_name'] = $customer->name;
            $validated['guest_phone'] = $customer->phone;
            $validated['guest_email'] = $customer->email;
        }

        if (! empty($validated['table_id'])) {
            $table = Table::where('id', $validated['table_id'])->first();
            if (! $table || ! $table->is_active || in_array($table->status, ['needs_cleaning', 'maintenance'], true)) {
                return $this->error('The selected table is not available.', 422);
            }
            if ((int) $validated['party_size'] > (int) $table->capacity) {
                return $this->error(
                    'Party size exceeds the capacity of the selected table.',
                    422
                );
            }
            if ($this->overlapsActiveReservation($validated['table_id'], $validated['reservation_date'], $validated['reservation_time'])) {
                return $this->error(
                    'This table is already reserved for the selected time.',
                    409
                );
            }
        }

        $validated['reservation_number'] = 'RES-' . strtoupper(uniqid());
        $validated['status'] = 'pending';

        $reservation = Reservation::create($validated);
        $reservation->load(['customer', 'table']);

        return $this->created([
            'id' => $reservation->id,
            'customer_id' => $reservation->customer_id,
            'table_id' => $reservation->table_id,
            'reservation_number' => $reservation->reservation_number,
            'guest_name' => $reservation->guest_name,
            'guest_phone' => $reservation->guest_phone,
            'guest_email' => $reservation->guest_email,
            'party_size' => $reservation->party_size,
            'reservation_date' => $reservation->reservation_date?->toDateString(),
            'reservation_time' => $reservation->reservation_time,
            'status' => $reservation->status,
            'source' => $reservation->source,
            'special_requests' => $reservation->special_requests,
            'customer' => $reservation->customer ? [
                'id' => $reservation->customer->id,
                'name' => $reservation->customer->name,
            ] : null,
            'table' => $reservation->table ? [
                'id' => $reservation->table->id,
                'number' => $reservation->table->number,
            ] : null,
            'created_at' => $reservation->created_at?->toISOString(),
            'updated_at' => $reservation->updated_at?->toISOString(),
        ], 'Reservation created successfully.');
    }

    /**
     * Archive a reservation (soft-hide; never deleted).
     *
     * Workflow safety: reservations still pending/confirmed cannot be
     * archived — confirm, complete, cancel or mark no-show first.
     */
    public function archive(Request $request, string $id): JsonResponse
    {
        $reservation = Reservation::find($id);

        if (!$reservation) {
            return $this->notFound('Reservation not found.');
        }

        if (in_array($reservation->status, ['pending', 'confirmed'], true)) {
            return $this->error(
                'Active reservations cannot be archived. Complete, cancel or mark this reservation as no-show first.',
                409
            );
        }

        // Idempotent.
        if ($reservation->archived_at === null) {
            $reservation->update(['archived_at' => now()]);
        }

        return $this->success([
            'id' => $reservation->id,
            'customer_id' => $reservation->customer_id,
            'table_id' => $reservation->table_id,
            'reservation_number' => $reservation->reservation_number,
            'status' => $reservation->status,
            'archived_at' => $reservation->archived_at?->toISOString(),
        ], 'Reservation archived successfully.');
    }

    /**
     * Restore an archived reservation (archived_at back to null).
     */
    public function unarchive(Request $request, string $id): JsonResponse
    {
        $reservation = Reservation::find($id);

        if (!$reservation) {
            return $this->notFound('Reservation not found.');
        }

        $reservation->update(['archived_at' => null]);

        return $this->success([
            'id' => $reservation->id,
            'reservation_number' => $reservation->reservation_number,
            'status' => $reservation->status,
            'archived_at' => null,
        ], 'Reservation restored successfully.');
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

        if (!$reservation) {
            return $this->notFound('Reservation not found.');
        }

        return $this->success([
            'id' => $reservation->id,
            'reservation_number' => $reservation->reservation_number,
            'guest_name' => $reservation->guest_name,
            'guest_phone' => $reservation->guest_phone,
            'guest_email' => $reservation->guest_email,
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
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $reservation = Reservation::find($id);

        if (!$reservation) {
            return $this->notFound('Reservation not found.');
        }

        if (in_array($reservation->status, ['completed', 'cancelled', 'no_show'])) {
            return $this->error('Cannot modify a reservation with status: ' . $reservation->status, 409);
        }

        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'table_id' => 'nullable|exists:tables,id',
            'guest_name' => 'nullable|string|max:255',
            'guest_phone' => 'nullable|string|max:50',
            'guest_email' => 'nullable|email|max:255',
            'party_size' => 'sometimes|integer|min:1',
            'reservation_date' => 'sometimes|date|after_or_equal:today',
            'reservation_time' => 'sometimes|date_format:H:i',
            'source' => 'sometimes|string|in:phone,online,walk_in,app',
            'special_requests' => 'nullable|string|max:2000',
        ]);

        if (isset($validated['reservation_date'])) {
            $validated['reservation_date'] = Carbon::parse($validated['reservation_date'])->toDateString();
        }

        $customerId = array_key_exists('customer_id', $validated)
            ? $validated['customer_id']
            : $reservation->customer_id;

        if ($customerId) {
            $customer = Customer::where('is_active', true)->find($customerId);
            if (! $customer) {
                return $this->error('Select an active registered customer.', 422);
            }
            $validated['guest_name'] = $customer->name;
            $validated['guest_phone'] = $customer->phone;
            $validated['guest_email'] = $customer->email;
        } else {
            $guestName = $validated['guest_name'] ?? $reservation->guest_name;
            $guestPhone = $validated['guest_phone'] ?? $reservation->guest_phone;
            if (! is_string($guestName) || trim($guestName) === '') {
                return $this->error('Guest name is required for a guest reservation.', 422);
            }
            if (! is_string($guestPhone) || trim($guestPhone) === '') {
                return $this->error('Guest phone is required for a guest reservation.', 422);
            }
        }

        $tableId = $validated['table_id'] ?? $reservation->table_id;
        $date = $validated['reservation_date'] ?? $reservation->reservation_date->toDateString();
        $time = $validated['reservation_time'] ?? $reservation->reservation_time;

        if (! empty($tableId)) {
            $table = Table::where('id', $tableId)->first();
            if (! $table || ! $table->is_active || in_array($table->status, ['needs_cleaning', 'maintenance'], true)) {
                return $this->error('The selected table is not available.', 422);
            }
            if (isset($validated['party_size']) && (int) $validated['party_size'] > (int) $table->capacity) {
                return $this->error('Party size exceeds the capacity of the selected table.', 422);
            }
            if ($this->overlapsActiveReservation($tableId, $date, $time, $reservation->id)) {
                return $this->error('This table is already reserved for the selected time.', 409);
            }
        } elseif (isset($validated['party_size']) && $reservation->table_id) {
            $table = $reservation->table;
            if ((int) $validated['party_size'] > (int) $table->capacity) {
                return $this->error('Party size exceeds the capacity of the selected table.', 422);
            }
        }

        $reservation->update($validated);
        $reservation->load(['customer', 'table']);

        return $this->success([
            'id' => $reservation->id,
            'customer_id' => $reservation->customer_id,
            'table_id' => $reservation->table_id,
            'reservation_number' => $reservation->reservation_number,
            'guest_name' => $reservation->guest_name,
            'guest_phone' => $reservation->guest_phone,
            'guest_email' => $reservation->guest_email,
            'party_size' => $reservation->party_size,
            'reservation_date' => $reservation->reservation_date?->toDateString(),
            'reservation_time' => $reservation->reservation_time,
            'status' => $reservation->status,
            'source' => $reservation->source,
            'special_requests' => $reservation->special_requests,
            'customer' => $reservation->customer ? [
                'id' => $reservation->customer->id,
                'name' => $reservation->customer->name,
            ] : null,
            'table' => $reservation->table ? [
                'id' => $reservation->table->id,
                'number' => $reservation->table->number,
            ] : null,
            'created_at' => $reservation->created_at?->toISOString(),
            'updated_at' => $reservation->updated_at?->toISOString(),
        ], 'Reservation updated successfully.');
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $reservation = Reservation::find($id);

        if (!$reservation) {
            return $this->notFound('Reservation not found.');
        }

        $validated = $request->validate([
            'status' => 'required|string|in:pending,confirmed,seated,completed,cancelled,no_show',
            'cancellation_reason' => 'nullable|string|max:1000',
        ]);

        if ($validated['status'] === 'cancelled' && empty($validated['cancellation_reason'])) {
            return $this->error('Cancellation reason is required.', 422);
        }

        $reservation->update($validated);

        if ($validated['status'] === 'cancelled' && $reservation->table_id) {
            Table::where('id', $reservation->table_id)
                ->where('status', 'reserved')
                ->update(['status' => 'available']);
        }

        return $this->success([
            'id' => $reservation->id,
            'reservation_number' => $reservation->reservation_number,
            'status' => $reservation->status,
        ], 'Reservation status updated successfully.');
    }
}
