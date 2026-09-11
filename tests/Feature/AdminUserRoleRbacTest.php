<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Manager user/role RBAC hardening.
 *
 * Policy: manager keeps READ-ONLY oversight of users/roles/audit/settings,
 * but every user/role mutation (POST/PUT/DELETE) is admin-only. Route
 * middleware (role:admin) is authoritative; UserController/RoleController
 * also refuse non-admin writes as defense-in-depth.
 *
 * Uses RefreshDatabase — never touches live accounts.
 */
class AdminUserRoleRbacTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(
            Role::firstOrCreate(
                ['name' => $role],
                ['display_name' => ucfirst(str_replace('_', ' ', $role)), 'is_system' => true]
            )
        );

        return $user->fresh();
    }

    private function targetUser(string $role = 'waiter'): User
    {
        return $this->userWithRole($role);
    }

    private function customRole(): Role
    {
        return Role::create([
            'name' => 'custom_role_'.uniqid(),
            'display_name' => 'Custom Role',
            'description' => 'RBAC test role',
            'is_system' => false,
        ]);
    }

    public function test_manager_keeps_read_only_oversight(): void
    {
        $manager = $this->userWithRole('manager');

        $this->actingAs($manager)->getJson('/api/v1/admin/users')->assertStatus(200);
        $this->actingAs($manager)->getJson('/api/v1/admin/roles')->assertStatus(200);
        $this->actingAs($manager)->getJson('/api/v1/admin/permissions')->assertStatus(200);
        $this->actingAs($manager)->getJson('/api/v1/admin/audit-logs')->assertStatus(200);
        $this->actingAs($manager)->getJson('/api/v1/admin/settings')->assertStatus(200);
    }

    public function test_manager_cannot_mutate_users(): void
    {
        $manager = $this->userWithRole('manager');
        $target = $this->targetUser();
        $cashierRole = Role::firstOrCreate(
            ['name' => 'cashier'],
            ['display_name' => 'Cashier', 'is_system' => true]
        );

        // Create with any role (incl. admin) must be refused.
        $this->actingAs($manager)->postJson('/api/v1/admin/users', [
            'name' => 'Escalation Attempt',
            'email' => 'escalation-'.uniqid().'@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'admin',
        ])->assertStatus(403);

        // Role change (incl. self-elevation shape) must be refused.
        $this->actingAs($manager)->putJson("/api/v1/admin/users/{$target->id}", [
            'role_id' => $cashierRole->id,
        ])->assertStatus(403);

        // Status flip (deactivate, incl. admin target shape) must be refused.
        $this->actingAs($manager)->putJson("/api/v1/admin/users/{$target->id}", [
            'is_active' => false,
        ])->assertStatus(403);

        // Delete must be refused.
        $this->actingAs($manager)->deleteJson("/api/v1/admin/users/{$target->id}")
            ->assertStatus(403);

        // Nothing changed.
        $this->assertTrue($target->fresh()->is_active);
    }

    public function test_manager_cannot_mutate_roles(): void
    {
        $manager = $this->userWithRole('manager');
        $role = $this->customRole();

        $this->actingAs($manager)->postJson('/api/v1/admin/roles', [
            'name' => 'manager_made_role_'.uniqid(),
            'display_name' => 'Manager Made',
        ])->assertStatus(403);

        $this->actingAs($manager)->putJson("/api/v1/admin/roles/{$role->id}", [
            'display_name' => 'Hijacked',
            'permissions' => [],
        ])->assertStatus(403);

        $this->actingAs($manager)->deleteJson("/api/v1/admin/roles/{$role->id}")
            ->assertStatus(403);
    }

    public function test_non_privileged_roles_cannot_mutate_users_or_roles(): void
    {
        foreach (['waiter', 'kitchen_staff', 'cashier', 'inventory_staff'] as $role) {
            $user = $this->userWithRole($role);
            $target = $this->targetUser();

            $this->actingAs($user)->postJson('/api/v1/admin/users', [
                'name' => 'Nope',
                'email' => 'nope-'.uniqid().'@example.com',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'role' => 'waiter',
            ])->assertStatus(403);

            $this->actingAs($user)->putJson("/api/v1/admin/users/{$target->id}", [
                'is_active' => false,
            ])->assertStatus(403);

            $this->actingAs($user)->deleteJson("/api/v1/admin/users/{$target->id}")
                ->assertStatus(403);

            $this->actingAs($user)->postJson('/api/v1/admin/roles', [
                'name' => 'nope_role_'.uniqid(),
            ])->assertStatus(403);
        }
    }

    public function test_admin_user_mutations_still_allowed(): void
    {
        $admin = $this->userWithRole('admin');
        $target = $this->targetUser();
        $cashierRole = Role::firstOrCreate(
            ['name' => 'cashier'],
            ['display_name' => 'Cashier', 'is_system' => true]
        );

        // Create.
        $createdId = $this->actingAs($admin)->postJson('/api/v1/admin/users', [
            'name' => 'Legit User',
            'email' => 'legit-'.uniqid().'@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'waiter',
        ])->assertStatus(201)->json('data.id');
        $this->assertNotEmpty($createdId);

        // Role change.
        $this->actingAs($admin)->putJson("/api/v1/admin/users/{$target->id}", [
            'role_id' => $cashierRole->id,
        ])->assertStatus(200);
        $this->assertSame('cashier', $target->fresh()->roles->first()->name);

        // Status flip.
        $this->actingAs($admin)->putJson("/api/v1/admin/users/{$target->id}", [
            'is_active' => false,
        ])->assertStatus(200);
        $this->assertFalse($target->fresh()->is_active);

        // Delete.
        $this->actingAs($admin)->deleteJson("/api/v1/admin/users/{$createdId}")
            ->assertStatus(200);
    }

    public function test_admin_role_mutations_still_allowed(): void
    {
        $admin = $this->userWithRole('admin');

        $roleId = $this->actingAs($admin)->postJson('/api/v1/admin/roles', [
            'name' => 'legit_role_'.uniqid(),
            'display_name' => 'Legit Role',
        ])->assertStatus(201)->json('data.id');
        $this->assertNotEmpty($roleId);

        $this->actingAs($admin)->putJson("/api/v1/admin/roles/{$roleId}", [
            'display_name' => 'Legit Role Renamed',
        ])->assertStatus(200);

        $this->actingAs($admin)->deleteJson("/api/v1/admin/roles/{$roleId}")
            ->assertStatus(200);
    }
}
