<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Outlet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OutletController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Outlet::query();

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', ["%".strtolower($search)."%"])
                    ->orWhereRaw('LOWER(address) LIKE ?', ["%".strtolower($search)."%"]);
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $outlets = $query->orderBy('created_at', 'desc')->get();

        $data = $outlets->map(fn (Outlet $outlet) => [
            'id' => $outlet->id,
            'name' => $outlet->name,
            'address' => $outlet->address,
            'phone' => $outlet->phone,
            'is_active' => $outlet->is_active,
            'created_at' => $outlet->created_at?->toISOString(),
            'updated_at' => $outlet->updated_at?->toISOString(),
        ]);

        return $this->success(['items' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:outlets,name',
            'address' => 'nullable|string|max:1000',
            'phone' => 'nullable|string|max:50',
            'is_active' => 'sometimes|boolean',
        ]);

        $outlet = Outlet::create($validated);

        return $this->created([
            'id' => $outlet->id,
            'name' => $outlet->name,
            'address' => $outlet->address,
            'phone' => $outlet->phone,
            'is_active' => $outlet->is_active,
            'created_at' => $outlet->created_at?->toISOString(),
            'updated_at' => $outlet->updated_at?->toISOString(),
        ], 'Outlet created successfully.');
    }

    public function show(string $id): JsonResponse
    {
        $outlet = Outlet::find($id);

        if (!$outlet) {
            return $this->notFound('Outlet not found.');
        }

        return $this->success([
            'id' => $outlet->id,
            'name' => $outlet->name,
            'address' => $outlet->address,
            'phone' => $outlet->phone,
            'is_active' => $outlet->is_active,
            'created_at' => $outlet->created_at?->toISOString(),
            'updated_at' => $outlet->updated_at?->toISOString(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $outlet = Outlet::find($id);

        if (!$outlet) {
            return $this->notFound('Outlet not found.');
        }

        $validated = $request->validate([
            'name' => "sometimes|string|max:255|unique:outlets,name,{$id}",
            'address' => 'nullable|string|max:1000',
            'phone' => 'nullable|string|max:50',
            'is_active' => 'sometimes|boolean',
        ]);

        $outlet->update($validated);

        return $this->success([
            'id' => $outlet->id,
            'name' => $outlet->name,
            'address' => $outlet->address,
            'phone' => $outlet->phone,
            'is_active' => $outlet->is_active,
            'created_at' => $outlet->created_at?->toISOString(),
            'updated_at' => $outlet->updated_at?->toISOString(),
        ], 'Outlet updated successfully.');
    }
}
