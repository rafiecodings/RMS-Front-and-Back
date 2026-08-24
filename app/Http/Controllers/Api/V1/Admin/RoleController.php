<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Role::with('permissions');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('display_name', 'ilike', "%{$search}%");
            });
        }

        $roles = $query->orderBy('created_at', 'desc')->get();

        $data = $roles->map(fn (Role $role) => [
            'id' => $role->id,
            'name' => $role->name,
            'display_name' => $role->display_name,
            'description' => $role->description,
            'is_system' => $role->is_system,
            'permissions' => $role->permissions->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'display_name' => $p->display_name,
                'module' => $p->module,
            ]),
            'users_count' => $role->users()->count(),
            'created_at' => $role->created_at?->toISOString(),
            'updated_at' => $role->updated_at?->toISOString(),
        ]);

        return $this->success(['items' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
            'display_name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'permissions' => 'sometimes|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'display_name' => $validated['display_name'] ?? null,
            'description' => $validated['description'] ?? null,
        ]);

        if (! empty($validated['permissions'])) {
            $permissionIds = Permission::whereIn('name', $validated['permissions'])->pluck('id');
            $role->permissions()->sync($permissionIds);
        }

        $role->load('permissions');

        return $this->created([
            'id' => $role->id,
            'name' => $role->name,
            'display_name' => $role->display_name,
            'description' => $role->description,
            'is_system' => $role->is_system,
            'permissions' => $role->permissions->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'display_name' => $p->display_name,
                'module' => $p->module,
            ]),
            'created_at' => $role->created_at?->toISOString(),
            'updated_at' => $role->updated_at?->toISOString(),
        ], 'Role created successfully.');
    }

    public function show(string $id): JsonResponse
    {
        $role = Role::with('permissions')->find($id);

        if (! $role) {
            return $this->notFound('Role not found.');
        }

        return $this->success([
            'id' => $role->id,
            'name' => $role->name,
            'display_name' => $role->display_name,
            'description' => $role->description,
            'is_system' => $role->is_system,
            'permissions' => $role->permissions->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'display_name' => $p->display_name,
                'module' => $p->module,
            ]),
            'users_count' => $role->users()->count(),
            'created_at' => $role->created_at?->toISOString(),
            'updated_at' => $role->updated_at?->toISOString(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $role = Role::find($id);

        if (! $role) {
            return $this->notFound('Role not found.');
        }

        if ($role->is_system) {
            return $this->error('System roles cannot be modified.', 403);
        }

        $validated = $request->validate([
            'name' => "sometimes|string|max:255|unique:roles,name,{$id}",
            'display_name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'permissions' => 'sometimes|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $role->update(collect($validated)->only(['name', 'display_name', 'description'])->toArray());

        if (array_key_exists('permissions', $validated)) {
            $permissionIds = Permission::whereIn('name', $validated['permissions'] ?? [])->pluck('id');
            $role->permissions()->sync($permissionIds);
        }

        $role->load('permissions');

        return $this->success([
            'id' => $role->id,
            'name' => $role->name,
            'display_name' => $role->display_name,
            'description' => $role->description,
            'is_system' => $role->is_system,
            'permissions' => $role->permissions->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'display_name' => $p->display_name,
                'module' => $p->module,
            ]),
            'created_at' => $role->created_at?->toISOString(),
            'updated_at' => $role->updated_at?->toISOString(),
        ], 'Role updated successfully.');
    }

    public function destroy(string $id): JsonResponse
    {
        $role = Role::find($id);

        if (! $role) {
            return $this->notFound('Role not found.');
        }

        if ($role->is_system) {
            return $this->error('System roles cannot be deleted.', 403);
        }

        if ($role->users()->count() > 0) {
            return $this->error('Cannot delete role with assigned users.', 409);
        }

        $role->permissions()->detach();
        $role->delete();

        return $this->noContent('Role deleted successfully.');
    }
}
