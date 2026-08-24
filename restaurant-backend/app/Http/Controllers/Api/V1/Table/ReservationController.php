<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Table;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Table;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReservationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Reservation::with(['customer', 'table']);

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

        $reservation = Reservation::create($validated);
        $reservation->load(['customer', 'table']);

        return $this->created([
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
            'guest_name' => 'sometimes|string|max:255',
            'guest_phone' => 'nullable|string|max:50',
            'guest_email' => 'nullable|email|max:255',
            'party_size' => 'sometimes|integer|min:1',
            'reservation_date' => 'sometimes|date|after_or_equal:today',
            'reservation_time' => 'sometimes|date_format:H:i',
            'source' => 'sometimes|string|in:phone,online,walk_in,app',
            'special_requests' => 'nullable|string|max:2000',
        ]);

        $reservation->update($validated);
        $reservation->load(['customer', 'table']);

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
