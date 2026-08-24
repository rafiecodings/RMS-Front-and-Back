<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Customer;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Customer::query();

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%")
                    ->orWhere('phone', 'ilike', "%{$search}%");
            });
        }

        if ($type = $request->input('customer_type')) {
            $query->where('customer_type', $type);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $customers = $query->withCount(['orders', 'reservations'])
            // Default listing is alphabetical by name (server-side so
            // pagination stays correct); search results keep this order.
            ->orderBy('name', 'asc')
            ->paginate($request->integer('per_page', 15));

        $data = $customers->getCollection()->map(fn (Customer $c) => [
            'id' => $c->id,
            'name' => $c->name,
            'email' => $c->email,
            'phone' => $c->phone,
            'address' => $c->address,
            'birthday' => $c->birthday,
            'dietary_restrictions' => $c->dietary_restrictions,
            'customer_type' => $c->customer_type,
            'loyalty_points' => $c->loyalty_points,
            'total_orders' => (int) $c->orders_count,
            'total_reservations' => (int) $c->reservations_count,
            'total_spent' => (float) $c->total_spent,
            'visit_count' => $c->visit_count,
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
            'customer_type' => 'sometimes|string|in:walk_in,regular',
            'notes' => 'nullable|string|max:2000',
            'is_active' => 'sometimes|boolean',
        ]);

        $validated['loyalty_points'] = 0;
        $validated['total_spent'] = 0;
        $validated['visit_count'] = 0;

        $customer = Customer::create($validated);

        return $this->created([
            'id' => $customer->id,
            'name' => $customer->name,
            'email' => $customer->email,
            'phone' => $customer->phone,
            'address' => $customer->address,
            'birthday' => $customer->birthday,
            'dietary_restrictions' => $customer->dietary_restrictions,
            'customer_type' => $customer->customer_type,
            'loyalty_points' => $customer->loyalty_points,
            'total_orders' => 0,
            'total_reservations' => 0,
            'total_spent' => (float) $customer->total_spent,
            'visit_count' => $customer->visit_count,
            'notes' => $customer->notes,
            'is_active' => $customer->is_active,
            'created_at' => $customer->created_at?->toISOString(),
            'updated_at' => $customer->updated_at?->toISOString(),
        ], 'Customer created successfully.');
    }

    public function show(string $id): JsonResponse
    {
        $customer = Customer::withCount(['orders', 'reservations'])
            ->with(['reservations' => function ($q) {
                $q->with('table')
                    ->orderBy('reservation_date', 'desc')
                    ->orderBy('reservation_time', 'desc');
            }])
            ->find($id);

        if (! $customer) {
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
            'customer_type' => $customer->customer_type,
            'loyalty_points' => $customer->loyalty_points,
            'total_orders' => (int) $customer->orders_count,
            'total_reservations' => (int) $customer->reservations_count,
            'total_spent' => (float) $customer->total_spent,
            'visit_count' => $customer->visit_count,
            'notes' => $customer->notes,
            'is_active' => $customer->is_active,
            'reservations' => $customer->reservations->map(fn ($r) => [
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
                'created_at' => $r->created_at?->toISOString(),
            ]),
            'created_at' => $customer->created_at?->toISOString(),
            'updated_at' => $customer->updated_at?->toISOString(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $customer = Customer::find($id);

        if (! $customer) {
            return $this->notFound('Customer not found.');
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => "sometimes|email|unique:customers,email,{$id}",
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:1000',
            'birthday' => 'nullable|date',
            'dietary_restrictions' => 'nullable|string|max:1000',
            'customer_type' => 'sometimes|string|in:walk_in,regular',
            'notes' => 'nullable|string|max:2000',
            'is_active' => 'sometimes|boolean',
        ]);

        $customer->update($validated);

        return $this->success([
            'id' => $customer->id,
            'name' => $customer->name,
            'email' => $customer->email,
            'phone' => $customer->phone,
            'address' => $customer->address,
            'birthday' => $customer->birthday,
            'dietary_restrictions' => $customer->dietary_restrictions,
            'customer_type' => $customer->customer_type,
            'loyalty_points' => $customer->loyalty_points,
            'total_orders' => (int) $customer->orders()->count(),
            'total_reservations' => (int) $customer->reservations()->count(),
            'total_spent' => (float) $customer->total_spent,
            'visit_count' => $customer->visit_count,
            'notes' => $customer->notes,
            'is_active' => $customer->is_active,
            'created_at' => $customer->created_at?->toISOString(),
            'updated_at' => $customer->updated_at?->toISOString(),
        ], 'Customer updated successfully.');
    }

    public function destroy(string $id): JsonResponse
    {
        $customer = Customer::find($id);

        if (! $customer) {
            return $this->notFound('Customer not found.');
        }

        if ($customer->orders()->count() > 0) {
            return $this->error('Cannot delete customer with existing orders.', 409);
        }

        $customer->delete();

        return $this->noContent('Customer deleted successfully.');
    }

public function archive(string $id): JsonResponse
    {
        $customer = Customer::find($id);

        if (! $customer) {
            return $this->notFound('Customer not found.');
        }

        $customer->update(['is_active' => false]);

        return $this->success([
            'id' => $customer->id,
            'name' => $customer->name,
            'is_active' => false,
        ], 'Customer archived successfully.');
    }

    public function orders(Request $request, string $id): JsonResponse
    {
        $customer = Customer::find($id);

        if (! $customer) {
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

    public function reservations(Request $request, string $id): JsonResponse
    {
        $customer = Customer::find($id);

        if (! $customer) {
            return $this->notFound('Customer not found.');
        }

        $query = $customer->reservations()->with('table');

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $reservations = $query->orderBy('reservation_date', 'desc')
            ->orderBy('reservation_time', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $reservations->getCollection()->map(fn ($r) => [
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
            'created_at' => $r->created_at?->toISOString(),
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

    public function loyalty(string $id): JsonResponse
    {
        $customer = Customer::withCount(['orders', 'reservations'])->find($id);

        if (! $customer) {
            return $this->notFound('Customer not found.');
        }

        return $this->success([
            'customer_id' => $customer->id,
            'name' => $customer->name,
            'loyalty_points' => $customer->loyalty_points,
            'total_spent' => (float) $customer->total_spent,
            'visit_count' => $customer->visit_count,
            'total_orders' => (int) $customer->orders_count,
            'total_reservations' => (int) $customer->reservations_count,
            'customer_type' => $customer->customer_type,
        ]);
    }
}

