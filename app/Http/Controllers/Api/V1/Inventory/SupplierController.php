<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Supplier::withCount('ingredients');

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('contact_person', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        $suppliers = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $suppliers->getCollection()->map(fn (Supplier $s) => [
            'id' => $s->id,
            'name' => $s->name,
            'contact_person' => $s->contact_person,
            'email' => $s->email,
            'phone' => $s->phone,
            'address' => $s->address,
            'payment_terms' => $s->payment_terms,
            'rating' => (float) $s->rating,
            'is_active' => $s->is_active,
            'ingredients_count' => $s->ingredients_count,
            'created_at' => $s->created_at?->toISOString(),
            'updated_at' => $s->updated_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $suppliers->currentPage(),
                'last_page' => $suppliers->lastPage(),
                'per_page' => $suppliers->perPage(),
                'total' => $suppliers->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:1000',
            'payment_terms' => 'nullable|string|max:500',
            'rating' => 'nullable|numeric|min:0|max:5',
            'is_active' => 'sometimes|boolean',
        ]);

        $supplier = Supplier::create($validated);

        return $this->created([
            'id' => $supplier->id,
            'name' => $supplier->name,
            'contact_person' => $supplier->contact_person,
            'email' => $supplier->email,
            'phone' => $supplier->phone,
            'address' => $supplier->address,
            'payment_terms' => $supplier->payment_terms,
            'rating' => (float) $supplier->rating,
            'is_active' => $supplier->is_active,
            'created_at' => $supplier->created_at?->toISOString(),
            'updated_at' => $supplier->updated_at?->toISOString(),
        ], 'Supplier created successfully.');
    }

    public function show(string $id): JsonResponse
    {
        $supplier = Supplier::withCount('ingredients')->find($id);

        if (! $supplier) {
            return $this->notFound('Supplier not found.');
        }

        return $this->success([
            'id' => $supplier->id,
            'name' => $supplier->name,
            'contact_person' => $supplier->contact_person,
            'email' => $supplier->email,
            'phone' => $supplier->phone,
            'address' => $supplier->address,
            'payment_terms' => $supplier->payment_terms,
            'rating' => (float) $supplier->rating,
            'is_active' => $supplier->is_active,
            'ingredients_count' => $supplier->ingredients_count,
            'created_at' => $supplier->created_at?->toISOString(),
            'updated_at' => $supplier->updated_at?->toISOString(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $supplier = Supplier::find($id);

        if (! $supplier) {
            return $this->notFound('Supplier not found.');
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:1000',
            'payment_terms' => 'nullable|string|max:500',
            'rating' => 'nullable|numeric|min:0|max:5',
            'is_active' => 'sometimes|boolean',
        ]);

        $supplier->update($validated);

        return $this->success([
            'id' => $supplier->id,
            'name' => $supplier->name,
            'contact_person' => $supplier->contact_person,
            'email' => $supplier->email,
            'phone' => $supplier->phone,
            'address' => $supplier->address,
            'payment_terms' => $supplier->payment_terms,
            'rating' => (float) $supplier->rating,
            'is_active' => $supplier->is_active,
            'created_at' => $supplier->created_at?->toISOString(),
            'updated_at' => $supplier->updated_at?->toISOString(),
        ], 'Supplier updated successfully.');
    }

    public function destroy(string $id): JsonResponse
    {
        $supplier = Supplier::find($id);

        if (! $supplier) {
            return $this->notFound('Supplier not found.');
        }

        if ($supplier->ingredients()->count() > 0) {
            return $this->error('Cannot delete supplier with linked ingredients.', 409);
        }

        $supplier->delete();

        return $this->noContent('Supplier deleted successfully.');
    }
}
