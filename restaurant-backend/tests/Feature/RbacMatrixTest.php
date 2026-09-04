<?php

namespace Tests\Feature;

use App\Models\Ingredient;
use App\Models\Invoice;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Payment;
use App\Models\ReplenishmentRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Six-role RBAC matrix (Admin / Manager / Waiter / Kitchen / Cashier /
 * Inventory). Asserts that each protected endpoint returns 403 for roles
 * outside its allowed set and is NOT blocked (reaches the controller) for
 * roles inside it.
 */
class RbacMatrixTest extends TestCase
{
    use RefreshDatabase;

    private const ROLES = ['admin', 'manager', 'waiter', 'kitchen', 'cashier', 'inventory_staff'];

    private MenuItem $menuItem;
    private string $orderPendingId;
    private string $orderPaidId;
    private string $invoiceId;
    private string $paymentId;
    private string $replenishId;

    protected function setUp(): void
    {
        parent::setUp();

        $admin = $this->userWithRole('admin');

        // Ensure a settings row exists so the settings endpoints don't try to
        // auto-create one (which would fail the NOT NULL name constraint).
        \App\Models\RestaurantSetting::create([
            'name' => 'RBAC Restaurant',
            'currency' => 'PHP',
            'currency_symbol' => '₱',
            'default_tax_rate' => 12,
            'vat_enabled' => true,
            'vat_inclusive' => true,
        ]);

        $category = MenuCategory::create([
            'name' => 'RBAC Cat',
            'slug' => 'rbac-cat-'.uniqid(),
        ]);
        $this->menuItem = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'RBAC Item',
            'slug' => 'rbac-item-'.uniqid(),
            'price' => 100,
        ]);

        $this->orderPendingId = $this->createOrder($admin);

        // A paid order + its invoice/payment for the payments/refund cases.
        $this->orderPaidId = $this->createOrder($admin);
        Order::where('id', $this->orderPaidId)->update(['status' => 'served']);
        $pay = $this->actingAs($admin)
            ->postJson("/api/v1/orders/{$this->orderPaidId}/payments", [
                'payment_method' => 'cash',
                'amount' => (float) Order::find($this->orderPaidId)->total,
            ])
            ->assertStatus(201)
            ->json('data.id');
        $this->paymentId = $pay;
        $this->invoiceId = Invoice::where('order_id', $this->orderPaidId)->first()->id;

        $ingredient = Ingredient::create([
            'name' => 'RBAC Ingr',
            'unit' => 'g',
            'current_stock' => 500,
            'minimum_stock' => 100,
            'cost_per_unit' => 0.05,
        ]);
        $this->replenishId = $this->actingAs($admin)
            ->postJson('/api/v1/inventory/replenishment', [
                'ingredient_id' => $ingredient->id,
                'quantity' => 300,
            ])
            ->assertStatus(201)
            ->json('data.id');
    }

    public function test_six_role_access_matrix(): void
    {
        $endpoints = [
            // label => [method, uri, payload, allowedRoles]
            'create_order' => ['POST', "/orders", [
                'order_type' => 'dine_in',
                'items' => [['menu_item_id' => $this->menuItem->id, 'quantity' => 1]],
            ], ['admin', 'manager', 'waiter', 'cashier']],
            'update_order_status' => ['PATCH', "/orders/{$this->orderPendingId}/status", [
                'status' => 'confirmed',
            ], ['admin', 'manager', 'waiter', 'cashier']],
            'void_order' => ['POST', "/orders/{$this->orderPendingId}/void", [
                'reason' => 'RBAC test void',
            ], ['admin', 'manager']],
            'pay_order' => ['POST', "/orders/{$this->orderPaidId}/payments", [
                'payment_method' => 'cash',
                'amount' => 1,
            ], ['admin', 'manager', 'cashier']],
            'refund' => ['POST', "/payments/{$this->invoiceId}/refund", [
                'payment_id' => $this->paymentId,
                'amount' => 1,
                'reason' => 'RBAC test refund',
            ], ['admin', 'manager']],
            'create_ingredient' => ['POST', '/inventory/ingredients', [
                'name' => 'X', 'unit' => 'g', 'current_stock' => 1, 'minimum_stock' => 1, 'cost_per_unit' => 1,
            ], ['admin', 'manager']],
            'create_replenishment' => ['POST', '/inventory/replenishment', [
                'ingredient_id' => $this->replenishIngredientId(),
                'quantity' => 10,
            ], ['admin', 'manager', 'inventory_staff']],
            'approve_replenishment' => ['PATCH', "/inventory/replenishment/{$this->replenishId}/status", [
                'status' => 'approved',
            ], ['admin', 'manager']],
            'settings_read' => ['GET', '/admin/settings', [], ['admin', 'manager']],
            'settings_write' => ['PUT', '/admin/settings', [], ['admin']],
            'reports' => ['GET', '/reports/sales', [], ['admin', 'manager']],
            'analytics' => ['GET', '/analytics/revenue', [], ['admin', 'manager']],
            'staff_write' => ['POST', '/staff', [], ['admin', 'manager']],
            'kot_read' => ['GET', '/kot', [], self::ROLES],
            'reservations_read' => ['GET', '/reservations', [], self::ROLES],
            'customers_read' => ['GET', '/customers', [], ['admin', 'manager', 'waiter', 'cashier']],
            'dashboard' => ['GET', '/dashboard/summary', [], ['admin', 'manager']],
        ];

        foreach (self::ROLES as $role) {
            $user = $this->userWithRole($role);

            foreach ($endpoints as [$method, $uri, $payload, $allowed]) {
                $forbidden = $allowed !== self::ROLES && !in_array($role, $allowed, true);

                $response = $this->actingAs($user)
                    ->json($method, "/api/v1{$uri}", $payload);

                if ($forbidden) {
                    $this->assertEquals(403, $response->getStatusCode(),
                        "Role '{$role}' should be blocked (403) but got {$response->getStatusCode()} on {$method} /api/v1{$uri}");
                } else {
                    $this->assertNotEquals(403, $response->getStatusCode(),
                        "Role '{$role}' was wrongly blocked (403) on {$method} /api/v1{$uri}");
                }
            }
        }

        $this->assertTrue(true); // matrix executed for all 6 roles
    }

    private function replenishIngredientId(): string
    {
        return ReplenishmentRequest::find($this->replenishId)->ingredient_id;
    }

    private function createOrder(User $as): string
    {
        $plan = \App\Models\FloorPlan::firstOrCreate(['name' => 'RBAC Floor'], ['slug' => 'rbac-floor-'.uniqid()]);
        $table = \App\Models\Table::firstOrCreate(['number' => 'T-RBAC-'.uniqid()], ['floor_plan_id' => $plan->id, 'capacity' => 4, 'status' => 'available', 'is_active' => true]);
        return $this->actingAs($as)
            ->postJson('/api/v1/orders', [
                'order_type' => 'dine_in',
                'table_id' => $table->id,
                'items' => [['menu_item_id' => $this->menuItem->id, 'quantity' => 1]],
            ])
            ->assertStatus(201)
            ->json('data.id');
    }

    private function userWithRole(string $role): User
    {
        $u = User::factory()->create();
        $u->roles()->attach(
            Role::firstOrCreate(['name' => $role], ['display_name' => ucfirst($role), 'module' => 'system'])
        );

        return $u;
    }
}
