<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\CashRegisterSession;
use App\Models\FloorPlan;
use App\Models\LeaveRequest;
use App\Models\Role;
use App\Models\StaffProfile;
use App\Models\Table;
use App\Models\User;
use App\Models\Ingredient;
use App\Models\KotTicket;
use App\Models\Order;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RbacHardeningFixTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $role): User
    {
        $u = User::factory()->create();
        $u->roles()->attach(Role::firstOrCreate(['name' => $role], ['display_name' => ucfirst($role), 'is_system' => true]));
        return $u->fresh()->load('roles');
    }

    private function tables(): array
    {
        $plan = FloorPlan::create(['name' => 'Fix Floor '.uniqid(), 'width' => 10, 'height' => 10]);
        $a = Table::create(['floor_plan_id' => $plan->id, 'number' => 'T-A-'.uniqid(), 'capacity' => 4, 'status' => 'available', 'is_active' => true]);
        $b = Table::create(['floor_plan_id' => $plan->id, 'number' => 'T-B-'.uniqid(), 'capacity' => 4, 'status' => 'available', 'is_active' => true]);
        return [$a, $b, $plan];
    }

    public function test_table_merge_rbac(): void
    {
        [$a, $b] = $this->tables();
        $admin = $this->userWithRole('admin');
        $manager = $this->userWithRole('manager');
        $waiter = $this->userWithRole('waiter');
        $cashier = $this->userWithRole('cashier');
        $kitchen = $this->userWithRole('kitchen_staff');
        $inventory = $this->userWithRole('inventory_staff');

        $payload = ['table_ids' => [$a->id, $b->id]];
        $this->actingAs($admin)->postJson('/api/v1/tables/merge', $payload)->assertStatus(200);
        [$a2, $b2] = $this->tables();
        $this->actingAs($manager)->postJson('/api/v1/tables/merge', ['table_ids' => [$a2->id, $b2->id]])->assertStatus(200);
        $this->actingAs($waiter)->postJson('/api/v1/tables/merge', $payload)->assertStatus(403);
        $this->actingAs($cashier)->postJson('/api/v1/tables/merge', $payload)->assertStatus(403);
        $this->actingAs($kitchen)->postJson('/api/v1/tables/merge', $payload)->assertStatus(403);
        $this->actingAs($inventory)->postJson('/api/v1/tables/merge', $payload)->assertStatus(403);
    }

    public function test_table_split_rbac(): void
    {
        $plan = FloorPlan::create(['name' => 'Split Floor '.uniqid(), 'width' => 10, 'height' => 10]);
        $parent = Table::create(['floor_plan_id' => $plan->id, 'number' => 'T-P-'.uniqid(), 'capacity' => 8, 'status' => 'occupied', 'is_active' => true]);
        $admin = $this->userWithRole('admin');
        $manager = $this->userWithRole('manager');
        $waiter = $this->userWithRole('waiter');
        $this->actingAs($waiter)->postJson('/api/v1/tables/split', ['table_id' => $parent->id])->assertStatus(403);
        $this->actingAs($admin)->postJson('/api/v1/tables/split', ['table_id' => $parent->id])->assertStatus(200);
        $plan2 = FloorPlan::create(['name' => 'Split2 '.uniqid(), 'width' => 10, 'height' => 10]);
        $parent2 = Table::create(['floor_plan_id' => $plan2->id, 'number' => 'T-P2-'.uniqid(), 'capacity' => 8, 'status' => 'occupied', 'is_active' => true]);
        $this->actingAs($manager)->postJson('/api/v1/tables/split', ['table_id' => $parent2->id])->assertStatus(200);
    }

    public function test_table_transfer_rbac(): void
    {
        [$a, $b] = $this->tables();
        $a->update(['status' => 'occupied']);
        $waiter = $this->userWithRole('waiter');
        $admin = $this->userWithRole('admin');
        $cashier = $this->userWithRole('cashier');
        $kitchen = $this->userWithRole('kitchen_staff');
        $inventory = $this->userWithRole('inventory_staff');
        $this->actingAs($waiter)->postJson('/api/v1/tables/transfer', ['from_table_id' => $a->id, 'to_table_id' => $b->id])->assertStatus(200);
        [$c, $d] = $this->tables();
        $c->update(['status' => 'occupied']);
        $this->actingAs($admin)->postJson('/api/v1/tables/transfer', ['from_table_id' => $c->id, 'to_table_id' => $d->id])->assertStatus(200);
        [$e, $f] = $this->tables();
        $e->update(['status' => 'occupied']);
        $this->actingAs($cashier)->postJson('/api/v1/tables/transfer', ['from_table_id' => $e->id, 'to_table_id' => $f->id])->assertStatus(403);
        $this->actingAs($kitchen)->postJson('/api/v1/tables/transfer', ['from_table_id' => $e->id, 'to_table_id' => $f->id])->assertStatus(403);
        $this->actingAs($inventory)->postJson('/api/v1/tables/transfer', ['from_table_id' => $e->id, 'to_table_id' => $f->id])->assertStatus(403);
    }

    public function test_waitlist_rbac(): void
    {
        $admin = $this->userWithRole('admin');
        $manager = $this->userWithRole('manager');
        $waiter = $this->userWithRole('waiter');
        $cashier = $this->userWithRole('cashier');
        $kitchen = $this->userWithRole('kitchen_staff');
        $inventory = $this->userWithRole('inventory_staff');

        $this->actingAs($admin)->getJson('/api/v1/waitlist')->assertStatus(200);
        $this->actingAs($manager)->getJson('/api/v1/waitlist')->assertStatus(200);
        $this->actingAs($waiter)->getJson('/api/v1/waitlist')->assertStatus(200);
        $this->actingAs($cashier)->getJson('/api/v1/waitlist')->assertStatus(403);
        $this->actingAs($kitchen)->getJson('/api/v1/waitlist')->assertStatus(403);
        $this->actingAs($inventory)->getJson('/api/v1/waitlist')->assertStatus(403);

        $this->actingAs($waiter)->postJson('/api/v1/waitlist', ['guest_name' => 'Test', 'guest_phone' => '09170000001', 'party_size' => 2])->assertStatus(201);
        $this->actingAs($cashier)->postJson('/api/v1/waitlist', ['guest_name' => 'Test', 'guest_phone' => '09170000002', 'party_size' => 2])->assertStatus(403);
    }

    public function test_discount_cashier_denied(): void
    {
        $cashier = $this->userWithRole('cashier');
        $admin = $this->userWithRole('admin');
        $manager = $this->userWithRole('manager');

        $this->actingAs($cashier)->getJson('/api/v1/discounts')->assertStatus(200);
        $this->actingAs($cashier)->postJson('/api/v1/discounts', ['name' => 'Cashier Promo '.uniqid(), 'code' => 'CASH'.uniqid(), 'type' => 'percentage', 'value' => 10, 'start_date' => now()->toDateString(), 'end_date' => now()->addDays(5)->toDateString(), 'promotion_kind' => 'automatic'])->assertStatus(403);
        $id = $this->actingAs($admin)->postJson('/api/v1/discounts', ['name' => 'Admin Promo '.uniqid(), 'code' => 'ADM'.uniqid(), 'type' => 'percentage', 'value' => 10, 'start_date' => now()->toDateString(), 'end_date' => now()->addDays(5)->toDateString(), 'promotion_kind' => 'automatic'])->assertStatus(201)->json('data.id');
        $this->actingAs($cashier)->putJson("/api/v1/discounts/{$id}", ['name' => 'Hijacked'])->assertStatus(403);
        $this->actingAs($cashier)->deleteJson("/api/v1/discounts/{$id}")->assertStatus(403);
        $this->actingAs($manager)->putJson("/api/v1/discounts/{$id}", ['name' => 'Manager Edit'])->assertStatus(200);
        $this->actingAs($admin)->deleteJson("/api/v1/discounts/{$id}")->assertStatus(200);
    }

    public function test_staff_directory_pii_restricted(): void
    {
        $waiter = $this->userWithRole('waiter');
        $kitchen = $this->userWithRole('kitchen_staff');
        $inventory = $this->userWithRole('inventory_staff');
        $admin = $this->userWithRole('admin');
        $manager = $this->userWithRole('manager');

        $this->actingAs($waiter)->getJson('/api/v1/staff')->assertStatus(403);
        $this->actingAs($kitchen)->getJson('/api/v1/staff')->assertStatus(403);
        $this->actingAs($inventory)->getJson('/api/v1/staff')->assertStatus(403);
        $this->actingAs($admin)->getJson('/api/v1/staff')->assertStatus(200);
        $this->actingAs($manager)->getJson('/api/v1/staff')->assertStatus(200);

        $profile = StaffProfile::create(['user_id' => $admin->id, 'employee_id' => 'EMP-PII-'.uniqid(), 'position' => 'Manager', 'hire_date' => now()->toDateString(), 'hourly_rate' => 100, 'base_salary' => 5000, 'is_active' => true]);
        $this->actingAs($waiter)->getJson("/api/v1/staff/{$profile->id}")->assertStatus(403);
        $this->actingAs($admin)->getJson("/api/v1/staff/{$profile->id}")->assertStatus(200);
        $this->assertEqualsWithDelta(5000, (float) $this->actingAs($admin)->getJson("/api/v1/staff/{$profile->id}")->json('data.base_salary'), 0.01);
        $this->actingAs($waiter)->getJson('/api/v1/staff/employees')->assertStatus(403);
        $this->actingAs($admin)->getJson('/api/v1/staff/me')->assertStatus(200);
        $this->actingAs($waiter)->getJson('/api/v1/staff/me')->assertStatus(200);
    }

    public function test_kot_access(): void
    {
        $admin = $this->userWithRole('admin');
        $waiter = $this->userWithRole('waiter');
        $kitchen = $this->userWithRole('kitchen_staff');
        $cashier = $this->userWithRole('cashier');
        $inventory = $this->userWithRole('inventory_staff');

        $this->actingAs($admin)->getJson('/api/v1/kot')->assertStatus(200);
        $this->actingAs($waiter)->getJson('/api/v1/kot')->assertStatus(200);
        $this->actingAs($kitchen)->getJson('/api/v1/kot')->assertStatus(200);
        $this->actingAs($cashier)->getJson('/api/v1/kot')->assertStatus(200);
        $this->actingAs($inventory)->getJson('/api/v1/kot')->assertStatus(200);

        $this->actingAs($cashier)->postJson('/api/v1/kot/'.'00000000-0000-0000-0000-000000000000'.'/print')->assertStatus(403);
        $this->actingAs($inventory)->postJson('/api/v1/kot/'.'00000000-0000-0000-0000-000000000000'.'/print')->assertStatus(403);
        $this->actingAs($waiter)->postJson('/api/v1/kot/'.'00000000-0000-0000-0000-000000000000'.'/print')->assertStatus(404);
    }

    public function test_inventory_sensitive_reads(): void
    {
        $admin = $this->userWithRole('admin');
        $manager = $this->userWithRole('manager');
        $inventory = $this->userWithRole('inventory_staff');
        $waiter = $this->userWithRole('waiter');
        $cashier = $this->userWithRole('cashier');
        $kitchen = $this->userWithRole('kitchen_staff');

        $this->actingAs($admin)->getJson('/api/v1/inventory/expiry')->assertStatus(200);
        $this->actingAs($manager)->getJson('/api/v1/inventory/expiry')->assertStatus(200);
        $this->actingAs($inventory)->getJson('/api/v1/inventory/expiry')->assertStatus(200);
        $this->actingAs($waiter)->getJson('/api/v1/inventory/expiry')->assertStatus(403);
        $this->actingAs($cashier)->getJson('/api/v1/inventory/expiry')->assertStatus(403);
        $this->actingAs($kitchen)->getJson('/api/v1/inventory/expiry')->assertStatus(403);

        $this->actingAs($waiter)->getJson('/api/v1/inventory/reconciliation')->assertStatus(403);
        $this->actingAs($admin)->getJson('/api/v1/inventory/reconciliation')->assertStatus(200);
    }

    public function test_cash_register_ownership(): void
    {
        $cashierA = $this->userWithRole('cashier');
        $cashierB = $this->userWithRole('cashier');
        $admin = $this->userWithRole('admin');
        $manager = $this->userWithRole('manager');

        $sessionA = $this->actingAs($cashierA)->postJson('/api/v1/cash-register/open', ['opening_balance' => 1000])->assertStatus(201)->json('data.id');
        $this->actingAs($cashierA)->postJson('/api/v1/cash-register/close', ['session_id' => $sessionA, 'actual_balance' => 1000])->assertStatus(200);

        $sessionB = $this->actingAs($cashierB)->postJson('/api/v1/cash-register/open', ['opening_balance' => 500])->assertStatus(201)->json('data.id');
        $this->actingAs($cashierA)->postJson('/api/v1/cash-register/close', ['session_id' => $sessionB, 'actual_balance' => 500])->assertStatus(403);
        $this->actingAs($cashierB)->postJson('/api/v1/cash-register/close', ['session_id' => $sessionB, 'actual_balance' => 500])->assertStatus(200);

        $sessionC = $this->actingAs($cashierB)->postJson('/api/v1/cash-register/open', ['opening_balance' => 300])->assertStatus(201)->json('data.id');
        $this->actingAs($admin)->postJson('/api/v1/cash-register/close', ['session_id' => $sessionC, 'actual_balance' => 300])->assertStatus(200);

        $sessionD = $this->actingAs($cashierB)->postJson('/api/v1/cash-register/open', ['opening_balance' => 200])->assertStatus(201)->json('data.id');
        $this->actingAs($manager)->postJson('/api/v1/cash-register/close', ['session_id' => $sessionD, 'actual_balance' => 200])->assertStatus(200);
    }

    public function test_leave_self_approval_blocked(): void
    {
        $managerUser = $this->userWithRole('manager');
        $admin = $this->userWithRole('admin');
        $managerProfile = StaffProfile::create(['user_id' => $managerUser->id, 'employee_id' => 'EMP-MGR-'.uniqid(), 'position' => 'Manager', 'hire_date' => now()->toDateString(), 'is_active' => true]);

        $leaveId = $this->actingAs($managerUser)->postJson("/api/v1/staff/{$managerProfile->id}/leave", ['leave_type' => 'vacation', 'reason' => 'Self leave', 'start_date' => now()->addDays(5)->toDateString(), 'end_date' => now()->addDays(6)->toDateString()])->assertStatus(201)->json('data.id');
        $this->actingAs($managerUser)->postJson("/api/v1/staff/leave-requests/{$leaveId}/approve", [])->assertStatus(403);
        $this->actingAs($managerUser)->postJson("/api/v1/staff/leave-requests/{$leaveId}/reject", [])->assertStatus(403);
        $this->actingAs($admin)->postJson("/api/v1/staff/leave-requests/{$leaveId}/approve", [])->assertStatus(200);
    }

    public function test_settings_defense_in_depth(): void
    {
        $manager = $this->userWithRole('manager');
        $admin = $this->userWithRole('admin');
        $waiter = $this->userWithRole('waiter');

        $this->actingAs($manager)->getJson('/api/v1/admin/settings')->assertStatus(200);
        $this->actingAs($waiter)->getJson('/api/v1/admin/settings')->assertStatus(403);
        $this->actingAs($manager)->putJson('/api/v1/admin/settings', ['name' => 'Hacked'])->assertStatus(403);
        $this->actingAs($admin)->putJson('/api/v1/admin/settings', ['name' => 'Legit Name'])->assertStatus(200);
    }
}
