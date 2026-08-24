<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load('roles');

        // Employment details exist only for users with a staff profile.
        $staff = \App\Models\StaffProfile::where('user_id', $user->id)->first();

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
            'employment' => $staff ? [
                'employee_id' => $staff->employee_id,
                'position' => $staff->position,
                'department' => $staff->department,
                'employment_type' => $staff->employment_type,
                'hire_date' => $staff->hire_date,
                'staff_status' => $staff->is_active ? 'active' : 'inactive',
            ] : null,
        ], 'Profile retrieved successfully.');
    }

    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,'.$request->user()->id,
            'avatar' => 'nullable|string|max:500',
        ]);

        $user = $request->user();
        $user->update($request->only(['name', 'email', 'avatar']));
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
        ], 'Profile updated successfully.');
    }
}
