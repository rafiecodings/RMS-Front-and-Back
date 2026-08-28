<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Customer;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Customer::query();

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', ["%".strtolower($search)."%"])
                    ->orWhereRaw('LOWER(email) LIKE ?', ["%".strtolower($search)."%"])
                    ->orWhereRaw('LOWER(phone) LIKE ?', ["%".strtolower($search)."%"]);
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $customers = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $customers->getCollection()->map(fn (Customer $c) => [
            'id' => $c->id,
            'name' => $c->name,
            'email' => $c->email,
            'phone' => $c->phone,
            'address' => $c->address,
            'birthday' => $c->birthday,
            'dietary_restrictions' => $c->dietary_restrictions,
            'customer_type' => 'registered',
            'loyalty_points' => $c->loyalty_points,
            'total_orders' => $c->orders()->count(),
            'total_reservations' => $c->reservations()->count(),
            'total_spent' => (float) $c->total_spent,
            'visit_count' => $c->visit_count,
            'loyalty_tier' => $c->loyaltyTier(),
            'notes' => $c->notes,
            'is_active' => $c->is_active,
            'created_at' => $c->created_at?->toISOString(),
            'updated_at' => $c->updated_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $customers->currentPage(),
                'last_page' => $customers->lastPage(),
                'per_page' => $customers->perPage(),
                'total' => $customers->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|unique:customers,email',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:1000',
            'birthday' => 'nullable|date',
            'dietary_restrictions' => 'nullable|string|max:1000',
            'notes' => 'nullable|string|max:2000',
            'is_active' => 'sometimes|boolean',
        ]);

        $validated['loyalty_points'] = 0;
        $validated['total_spent'] = 0;
        $validated['visit_count'] = 0;
        $validated['customer_type'] = 'registered';

        $customer = Customer::create($validated);

        return $this->created([
            'id' => $customer->id,
            'name' => $customer->name,
            'email' => $customer->email,
            'phone' => $customer->phone,
            'address' => $customer->address,
            'birthday' => $customer->birthday,
            'dietary_restrictions' => $customer->dietary_restrictions,
            'customer_type' => 'registered',
            'loyalty_points' => $customer->loyalty_points,
            'total_orders' => $customer->orders()->count(),
            'total_reservations' => $customer->reservations()->count(),
            'total_spent' => (float) $customer->total_spent,
            'visit_count' => $customer->visit_count,
            'notes' => $customer->notes,
            'loyalty_tier' => $customer->loyaltyTier(),
            'is_active' => $customer->is_active,
            'created_at' => $customer->created_at?->toISOString(),
            'updated_at' => $customer->updated_at?->toISOString(),
        ], 'Customer created successfully.');
    }

    public function show(string $id): JsonResponse
    {
        $customer = Customer::with(['reservations' => fn ($query) => $query
            ->with('table')
            ->orderByDesc('reservation_date')
            ->orderByDesc('reservation_time')])->find($id);

        if (!$customer) {
            return $this->notFound('Customer not found.');
        }

        return $this->success([
            'id' => $customer->id,
            'name' => $customer->name,
            'email' => $customer->email,
            'phone' => $customer->phone,
            'address' => $customer->address,
            'birthday' => $customer->birthday,
            'dietary_restrictions' => $customer->dietary_restrictions,
            'customer_type' => 'registered',
            'loyalty_points' => $customer->loyalty_points,
            'total_orders' => $customer->orders()->count(),
            'total_reservations' => $customer->reservations()->count(),
            'total_spent' => (float) $customer->total_spent,
            'visit_count' => $customer->visit_count,
            'notes' => $customer->notes,
            'loyalty_tier' => $customer->loyaltyTier(),
            'reservations' => $customer->reservations->map(fn ($reservation) => [
                'id' => $reservation->id,
                'reservation_number' => $reservation->reservation_number,
                'party_size' => $reservation->party_size,
                'reservation_date' => $reservation->reservation_date?->toDateString(),
                'reservation_time' => $reservation->reservation_time,
                'status' => $reservation->status,
                'table' => $reservation->table ? [
                    'id' => $reservation->table->id,
                    'number' => $reservation->table->number,
                ] : null,
            ])->values(),
            'is_active' => $customer->is_active,
            'created_at' => $customer->created_at?->toISOString(),
            'updated_at' => $customer->updated_at?->toISOString(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return $this->notFound('Customer not found.');
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => "sometimes|email|unique:customers,email,{$id}",
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:1000',
            'birthday' => 'nullable|date',
            'dietary_restrictions' => 'nullable|string|max:1000',
            // Loyalty is auto-derived from completed visits — never editable.
            'notes' => 'nullable|string|max:2000',
            'is_active' => 'sometimes|boolean',
        ]);
        unset($validated['customer_type'], $validated['loyalty_points'], $validated['visit_count'], $validated['total_spent']);

        $customer->update($validated);

        return $this->success([
            'id' => $customer->id,
            'name' => $customer->name,
            'email' => $customer->email,
            'phone' => $customer->phone,
            'customer_type' => 'registered',
            'loyalty_points' => $customer->loyalty_points,
            'total_spent' => (float) $customer->total_spent,
            'visit_count' => $customer->visit_count,
            'notes' => $customer->notes,
            'loyalty_tier' => $customer->loyaltyTier(),
            'is_active' => $customer->is_active,
            'created_at' => $customer->created_at?->toISOString(),
            'updated_at' => $customer->updated_at?->toISOString(),
        ], 'Customer updated successfully.');
    }

    public function destroy(string $id): JsonResponse
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return $this->notFound('Customer not found.');
        }

        if ($customer->orders()->count() > 0
            || \App\Models\Reservation::where('customer_id', $customer->id)->exists()) {
            return $this->error(
                'This customer has historical orders or reservations. Archive the customer instead of deleting to preserve history.',
                409
            );
        }

        $customer->delete();

        return $this->noContent('Customer deleted successfully.');
    }

    public function orders(Request $request, string $id): JsonResponse
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return $this->notFound('Customer not found.');
        }

        $orders = $customer->orders()
            ->with('table')
            ->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $orders->getCollection()->map(fn ($order) => [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'order_type' => $order->order_type,
            'status' => $order->status,
            'total' => (float) $order->total,
            'payment_status' => $order->payment_status,
            'table' => $order->table ? [
                'id' => $order->table->id,
                'number' => $order->table->number,
            ] : null,
            'created_at' => $order->created_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    public function loyalty(string $id): JsonResponse
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return $this->notFound('Customer not found.');
        }

        $totalOrders = $customer->orders()->count();
        $totalSpent = (float) $customer->total_spent;
        $points = $customer->loyalty_points;

        return $this->success([
            'customer_id' => $customer->id,
            'name' => $customer->name,
            'loyalty_points' => $points,
            'total_spent' => $totalSpent,
            'visit_count' => $customer->visit_count,
            'total_orders' => $totalOrders,
            'customer_type' => 'registered',
        ]);
    }

    /**
     * Archive a customer.
     *
     * Frontend contract: the Customers screen treats is_active = false as
     * "archived" (its Archived filter sends ?is_active=0), so archiving here
     * flips the existing flag instead of introducing archived_at. The record
     * is never deleted; restoring is done via PUT /customers/{id} with
     * is_active = true.
     */
    public function archive(string $id): JsonResponse
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return $this->notFound('Customer not found.');
        }

        // Idempotent.
        if ((bool) $customer->is_active) {
            $customer->update(['is_active' => false]);
        }

        return $this->success([
            'id' => $customer->id,
            'name' => $customer->name,
            'is_active' => false,
        ], 'Customer archived successfully.');
    }
}
