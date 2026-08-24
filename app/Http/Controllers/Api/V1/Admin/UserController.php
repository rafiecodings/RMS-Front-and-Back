<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::with('roles');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        if ($roleId = $request->input('role_id')) {
            $query->whereHas('roles', fn ($q) => $q->where('roles.id', $roleId));
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $users = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $users->getCollection()->map(fn (User $user) => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->roles->first()?->name ?? 'user',
            'avatar' => $user->avatar,
            'is_active' => $user->is_active,
            'last_login_at' => $user->last_login_at?->toISOString(),
            'created_at' => $user->created_at?->toISOString(),
            'updated_at' => $user->updated_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|string|exists:roles,name',
            'avatar' => 'nullable|string|max:500',
            'is_active' => 'sometimes|boolean',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'avatar' => $validated['avatar'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $user->roles()->attach(
            Role::where('name', $validated['role'])->first()
        );

        $user->load('roles');

        return $this->created([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->roles->first()?->name ?? 'user',
            'avatar' => $user->avatar,
            'is_active' => $user->is_active,
            'created_at' => $user->created_at?->toISOString(),
            'updated_at' => $user->updated_at?->toISOString(),
        ], 'User created successfully.');
    }

    public function show(string $id): JsonResponse
    {
        $user = User::with('roles')->find($id);

        if (! $user) {
            return $this->notFound('User not found.');
        }

        return $this->success([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->roles->first()?->name ?? 'user',
            'avatar' => $user->avatar,
            'is_active' => $user->is_active,
            'last_login_at' => $user->last_login_at?->toISOString(),
            'created_at' => $user->created_at?->toISOString(),
            'updated_at' => $user->updated_at?->toISOString(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = User::find($id);

        if (! $user) {
            return $this->notFound('User not found.');
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => "sometimes|email|unique:users,email,{$id}",
            'password' => 'sometimes|string|min:8|confirmed',
            'role' => 'sometimes|string|exists:roles,name',
            'avatar' => 'nullable|string|max:500',
            'is_active' => 'sometimes|boolean',
        ]);

        $data = collect($validated)->only(['name', 'email', 'avatar', 'is_active'])->toArray();

        if (! empty($validated['password'])) {
            $data['password'] = $validated['password'];
        }

        $user->update($data);

        if (! empty($validated['role'])) {
            $user->roles()->sync(
                Role::where('name', $validated['role'])->first()
            );
        }

        $user->load('roles');

        return $this->success([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->roles->first()?->name ?? 'user',
            'avatar' => $user->avatar,
            'is_active' => $user->is_active,
            'last_login_at' => $user->last_login_at?->toISOString(),
            'created_at' => $user->created_at?->toISOString(),
            'updated_at' => $user->updated_at?->toISOString(),
        ], 'User updated successfully.');
    }

    public function destroy(string $id): JsonResponse
    {
        $user = User::find($id);

        if (! $user) {
            return $this->notFound('User not found.');
        }

        if ($user->id === Auth::id()) {
            return $this->error('You cannot delete your own account.', 403);
        }

        $user->roles()->detach();
        $user->delete();

        return $this->noContent('User deleted successfully.');
    }
}
