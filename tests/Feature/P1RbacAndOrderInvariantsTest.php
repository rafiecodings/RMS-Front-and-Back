<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Role;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class P1RbacAndOrderInvariantsTest extends TestCase
{
    use RefreshDatabase;

    private MenuItem $menuItem;
    private Table $table;

    protected function setUp(): void
    {
        parent::setUp();
        \App\Models\RestaurantSetting::create([
            'name' => 'P1 Restaurant',
            'currency' => 'PHP',
            'currency_symbol' => '₱',
            'default_tax_rate' => 12,
            'vat_enabled' => true,
            'vat_inclusive' => true,
        ]);
        $cat = MenuCategory::create(['name' => 'P1 Cat', 'slug' => 'p1-cat-'.uniqid()]);
        $this->menuItem = MenuItem::create(['category_id' => $cat->id, 'name' => 'P1 Item', 'slug' => 'p1-item-'.uniqid(), 'price' => 100, 'is_available' => true]);
        $plan = \App\Models\FloorPlan::create(['name' => 'P1 Floor', 'slug' => 'p1-floor-'.uniqid()]);
        $this->table = Table::create(['floor_plan_id' => $plan->id, 'number' => 'T1', 'capacity' => 4, 'status' => 'available', 'is_active' => true]);
    }

    private function userWithRole(string $role): User
    {
        $u = User::factory()->create();
        $u->roles()->attach(Role::firstOrCreate(['name' => $role], ['display_name' => ucfirst($role), 'module' => 'system']));
        return $u;
    }

    private function createOrder(User $as, array $overrides = []): string
    {
        if (!isset($overrides['table_id']) && (!isset($overrides['order_type']) || $overrides['order_type'] === 'dine_in')) {
            $plan = \App\Models\FloorPlan::firstOrCreate(['name' => 'P1 Floor 2'], ['slug' => 'p1-floor2-'.uniqid()]);
            $table = \App\Models\Table::create(['floor_plan_id' => $plan->id, 'number' => 'T-P1-'.uniqid(), 'capacity' => 4, 'status' => 'available', 'is_active' => true]);
            $overrides['table_id'] = $table->id;
        }
        $payload = array_merge([
            'order_type' => 'dine_in',
            'table_id' => $this->table->id,
            'items' => [['menu_item_id' => $this->menuItem->id, 'quantity' => 1]],
        ], $overrides);
        // Ensure table_id from overrides takes precedence, and remove duplicate if overrides had new table
        if (isset($overrides['table_id'])) {
            $payload['table_id'] = $overrides['table_id'];
        }
        return $this->actingAs($as)->postJson('/api/v1/orders', $payload)->assertStatus(201)->json('data.id');
    }

    public function test_dashboard_role_aware_summary(): void
    {
        // All RMS roles may call the summary; operational roles receive a
        // filtered payload (asserted in depth by DashboardRoleTest).
        foreach (['admin', 'manager', 'waiter', 'kitchen_staff', 'cashier', 'inventory_staff'] as $role) {
            $user = $this->userWithRole($role);
            $this->actingAs($user)->getJson('/api/v1/dashboard/summary')->assertStatus(200);
        }
    }

    public function test_customers_rbac(): void
    {
        foreach (['admin' => 200, 'manager' => 200, 'waiter' => 200, 'cashier' => 200, 'kitchen_staff' => 403, 'inventory_staff' => 403] as $role => $expected) {
            $user = $this->userWithRole($role);
            $this->actingAs($user)->getJson('/api/v1/customers')->assertStatus($expected);
            // UUID detail also
            $customer = \App\Models\Customer::create(['name' => 'Test', 'phone' => '0911', 'customer_type' => 'registered']);
            $code = $expected === 200 ? 200 : 403;
            $this->actingAs($user)->getJson("/api/v1/customers/{$customer->id}")->assertStatus($code);
        }
    }

    public function test_table_status_rbac(): void
    {
        // Ensure table is available
        $this->table->update(['status' => 'available']);
        foreach (['admin' => 200, 'manager' => 200, 'waiter' => 200, 'kitchen_staff' => 403, 'cashier' => 403, 'inventory_staff' => 403] as $role => $expected) {
            // Reset to available before each
            $this->table->update(['status' => 'available']);
            $user = $this->userWithRole($role);
            $res = $this->actingAs($user)->patchJson("/api/v1/tables/{$this->table->id}/status", ['status' => 'reserved']);
            // For allowed roles, should be 200 (or at least not 403); for denied, 403
            if ($expected === 403) {
                $res->assertStatus(403);
            } else {
                $this->assertNotEquals(403, $res->getStatusCode(), "Role $role should not be 403 on table status");
            }
            // Reset back
            $this->table->update(['status' => 'available']);
        }
    }

    public function test_order_status_preparing_ready_restricted(): void
    {
        $admin = $this->userWithRole('admin');
        $waiter = $this->userWithRole('waiter');
        $kitchen = $this->userWithRole('kitchen_staff');

        $orderId = $this->createOrder($admin);
        $this->actingAs($waiter)->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'confirmed'])->assertStatus(200);
        $this->assertEquals('confirmed', \App\Models\Order::find($orderId)->status);
        $this->assertTrue(\App\Models\KotTicket::where('order_id', $orderId)->exists());

        $orderId2 = $this->createOrder($admin);
        $this->actingAs($admin)->patchJson("/api/v1/orders/{$orderId2}/status", ['status' => 'confirmed'])->assertStatus(200);
        $this->actingAs($kitchen)->patchJson("/api/v1/orders/{$orderId2}/status", ['status' => 'preparing'])->assertStatus(200);
        $this->actingAs($waiter)->patchJson("/api/v1/orders/{$orderId2}/status", ['status' => 'ready'])->assertStatus(403);
        $this->actingAs($kitchen)->patchJson("/api/v1/orders/{$orderId2}/status", ['status' => 'ready'])->assertStatus(200);

        $orderId3 = $this->createOrder($admin);
        $this->actingAs($admin)->patchJson("/api/v1/orders/{$orderId3}/status", ['status' => 'confirmed'])->assertStatus(200);
        $this->actingAs($waiter)->patchJson("/api/v1/orders/{$orderId3}/status", ['status' => 'preparing'])->assertStatus(403);
    }

    public function test_waiter_can_mark_served(): void
    {
        $admin = $this->userWithRole('admin');
        $orderId = $this->createOrder($admin);
        $waiter = $this->userWithRole('waiter');
        $kitchen = $this->userWithRole('kitchen_staff');
        $this->actingAs($waiter)->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'confirmed'])->assertStatus(200);
        $this->assertEquals('confirmed', \App\Models\Order::find($orderId)->status);
        $this->assertTrue(\App\Models\KotTicket::where('order_id', $orderId)->exists());
        $this->actingAs($kitchen)->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'preparing'])->assertStatus(200);
        $this->actingAs($kitchen)->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'ready'])->assertStatus(200);
        $this->actingAs($waiter)->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'served'])->assertStatus(200);
    }

    public function test_dine_in_requires_table(): void
    {
        $admin = $this->userWithRole('admin');
        // dine_in without table should be 422
        $this->actingAs($admin)->postJson('/api/v1/orders', [
            'order_type' => 'dine_in',
            'items' => [['menu_item_id' => $this->menuItem->id, 'quantity' => 1]],
        ])->assertStatus(422)->assertJsonValidationErrors(['table_id']);

        // dine_in with invalid table should be 422 (exists validation)
        $this->actingAs($admin)->postJson('/api/v1/orders', [
            'order_type' => 'dine_in',
            'table_id' => '00000000-0000-0000-0000-000000000000',
            'items' => [['menu_item_id' => $this->menuItem->id, 'quantity' => 1]],
        ])->assertStatus(422);

        // dine_in with valid table should succeed
        $this->actingAs($admin)->postJson('/api/v1/orders', [
            'order_type' => 'dine_in',
            'table_id' => $this->table->id,
            'items' => [['menu_item_id' => $this->menuItem->id, 'quantity' => 1]],
        ])->assertStatus(201);

        // takeaway without table should succeed
        $this->actingAs($admin)->postJson('/api/v1/orders', [
            'order_type' => 'takeaway',
            'items' => [['menu_item_id' => $this->menuItem->id, 'quantity' => 1]],
        ])->assertStatus(201);
    }

    public function test_reports_cashier_denied(): void
    {
        $cashier = $this->userWithRole('cashier');
        $this->actingAs($cashier)->getJson('/api/v1/reports/sales')->assertStatus(403);
        $this->actingAs($cashier)->getJson('/api/v1/analytics/revenue')->assertStatus(403);
        $admin = $this->userWithRole('admin');
        $this->actingAs($admin)->getJson('/api/v1/reports/sales')->assertStatus(200);
        $this->actingAs($admin)->getJson('/api/v1/analytics/revenue')->assertStatus(200);
    }

    public function test_uuid_route_constraint(): void
    {
        $admin = $this->userWithRole('admin');
        // Invalid UUID should be 404 due to whereUuid constraint, not 500
        $this->actingAs($admin)->getJson('/api/v1/customers/not-a-uuid')->assertStatus(404);
        $this->actingAs($admin)->getJson('/api/v1/orders/not-a-uuid')->assertStatus(404);
    }
}
