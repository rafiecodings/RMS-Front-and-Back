<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Role-aware GET /dashboard/summary.
 *
 * Admin/manager receive the full management payload. Operational roles
 * receive ONLY job-relevant sections — filtered server-side. These tests
 * prove sensitive keys are absent (not merely hidden in React).
 *
 * Uses RefreshDatabase — never touches live data.
 */
class DashboardRoleTest extends TestCase
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

    private function summary(string $role): array
    {
        $res = $this->actingAs($this->userWithRole($role))
            ->getJson('/api/v1/dashboard/summary')
            ->assertStatus(200);

        return $res->json('data');
    }

    public function test_admin_and_manager_receive_full_payload(): void
    {
        foreach (['admin', 'manager'] as $role) {
            $data = $this->summary($role);

            foreach (['revenue', 'sales', 'orders', 'tables', 'kitchen', 'top_selling_items', 'peak_hours', 'alerts', 'inventory_alerts', 'recent_orders', 'recent_activities', 'meta'] as $key) {
                $this->assertArrayHasKey($key, $data, "Role {$role} missing {$key}");
            }
            $this->assertArrayHasKey('today', $data['revenue']);
            $this->assertArrayHasKey('total_customers', $data['meta']);
        }
    }

    public function test_waiter_receives_operations_only(): void
    {
        $data = $this->summary('waiter');

        foreach (['orders', 'tables', 'kitchen', 'recent_orders', 'alerts', 'meta'] as $key) {
            $this->assertArrayHasKey($key, $data, "Waiter missing {$key}");
        }
        foreach (['revenue', 'sales', 'top_selling_items', 'peak_hours', 'inventory_alerts', 'recent_activities', 'inventory', 'recent_movements'] as $key) {
            $this->assertArrayNotHasKey($key, $data, "Waiter must not receive {$key}");
        }
        $this->assertArrayNotHasKey('total_customers', $data['meta']);
        $this->assertArrayNotHasKey('average_ticket', $data);

        // Waiter alerts are reservation-only: no supplier data leaks.
        foreach ($data['alerts'] as $alert) {
            $this->assertSame('reservation', $alert['type']);
        }
        $this->assertStringNotContainsStringIgnoringCase('supplier', json_encode($data));
    }

    public function test_cashier_receives_pos_operations_only(): void
    {
        $data = $this->summary('cashier');

        foreach (['orders', 'tables', 'recent_orders', 'meta'] as $key) {
            $this->assertArrayHasKey($key, $data, "Cashier missing {$key}");
        }
        foreach (['revenue', 'sales', 'kitchen', 'top_selling_items', 'peak_hours', 'inventory_alerts', 'recent_activities', 'inventory'] as $key) {
            $this->assertArrayNotHasKey($key, $data, "Cashier must not receive {$key}");
        }
        $this->assertArrayNotHasKey('total_customers', $data['meta']);
        $this->assertStringNotContainsStringIgnoringCase('supplier', json_encode($data));
    }

    public function test_kitchen_receives_kitchen_workflow_only(): void
    {
        $data = $this->summary('kitchen_staff');

        foreach (['orders', 'kitchen', 'recent_orders'] as $key) {
            $this->assertArrayHasKey($key, $data, "Kitchen missing {$key}");
        }
        foreach (['revenue', 'sales', 'tables', 'top_selling_items', 'peak_hours', 'inventory_alerts', 'recent_activities', 'inventory', 'alerts', 'meta'] as $key) {
            $this->assertArrayNotHasKey($key, $data, "Kitchen must not receive {$key}");
        }
        $this->assertArrayHasKey('queue_length', $data['kitchen']);
        $this->assertArrayHasKey('orders_in_progress', $data['kitchen']);
        $this->assertStringNotContainsStringIgnoringCase('supplier', json_encode($data));
    }

    public function test_inventory_receives_stock_operations_only(): void
    {
        $data = $this->summary('inventory_staff');

        foreach (['inventory', 'inventory_alerts', 'alerts'] as $key) {
            $this->assertArrayHasKey($key, $data, "Inventory missing {$key}");
        }
        foreach (['low_stock_count', 'out_of_stock_count', 'replenishment_pending', 'replenishment_by_status', 'recent_movements'] as $key) {
            $this->assertArrayHasKey($key, $data['inventory'], "Inventory missing inventory.{$key}");
        }
        foreach (['revenue', 'sales', 'orders', 'tables', 'kitchen', 'recent_orders', 'top_selling_items', 'peak_hours', 'recent_activities', 'meta'] as $key) {
            $this->assertArrayNotHasKey($key, $data, "Inventory must not receive {$key}");
        }

        // No cost/value leakage in movements.
        $this->assertStringNotContainsStringIgnoringCase('unit_cost', json_encode($data));
        $this->assertStringNotContainsStringIgnoringCase('revenue', json_encode($data));

        // Inventory alerts are stock-only: no guest/reservation PII.
        foreach ($data['alerts'] as $alert) {
            $this->assertSame('low_inventory', $alert['type']);
        }
    }

    public function test_unauthenticated_summary_is_401(): void
    {
        $this->getJson('/api/v1/dashboard/summary')->assertStatus(401);
    }

    public function test_granular_analytics_stay_admin_only(): void
    {
        foreach (['waiter', 'cashier', 'kitchen_staff', 'inventory_staff'] as $role) {
            $user = $this->userWithRole($role);
            $this->actingAs($user)->getJson('/api/v1/dashboard/revenue')->assertStatus(403);
            $this->actingAs($user)->getJson('/api/v1/reports/sales')->assertStatus(403);
            $this->actingAs($user)->getJson('/api/v1/analytics/revenue')->assertStatus(403);
        }
    }
}
