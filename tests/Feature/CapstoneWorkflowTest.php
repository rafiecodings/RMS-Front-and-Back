<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Ingredient;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ReplenishmentRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Capstone workflow rules: loyalty visit/tier automation and replenishment
 * request lifecycle.
 */
class CapstoneWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = $this->userWithRole('admin');
        $this->manager = $this->userWithRole('manager');
    }

    private function userWithRole(string $role): User
    {
        $u = User::factory()->create();
        $u->roles()->attach(
            Role::firstOrCreate(['name' => $role], ['display_name' => ucfirst($role), 'module' => 'system'])
        );

        return $u;
    }

    // ------------------------------------------------------------------
    // Loyalty: visits + tiers
    // ------------------------------------------------------------------

    public function test_completing_paid_order_increments_visit_once(): void
    {
        $customer = Customer::create([
            'name' => 'Loyal Tester',
            'phone' => '09171112222',
            'is_active' => true,
        ]);

        // Completion happens through a successful payment, not a status patch.
        $order = Order::create([
            'order_number' => 'ORD-'.uniqid(),
            'order_type' => 'takeaway',
            'status' => 'served',
            'payment_status' => 'unpaid',
            'customer_id' => $customer->id,
            'subtotal' => 200,
            'total' => 200,
        ]);

        $res = $this->actingAs($this->admin)
            ->postJson("/api/v1/orders/{$order->id}/payments", [
                'payment_method' => 'cash',
                'amount' => 200,
            ]);
        $res->assertStatus(201);

        $this->assertSame(1, (int) $customer->fresh()->visit_count);
        $this->assertEquals(200.0, (float) $customer->fresh()->total_spent);

        // Re-paying must NOT double-count the visit.
        $this->actingAs($this->admin)
            ->postJson("/api/v1/orders/{$order->id}/payments", [
                'payment_method' => 'cash',
                'amount' => 200,
            ])
            ->assertStatus(409);

        $this->assertSame(1, (int) $customer->fresh()->visit_count);
    }

    public function test_unpaid_completed_order_does_not_count_as_visit(): void
    {
        $customer = Customer::create([
            'name' => 'Unpaid Visitor',
            'phone' => '09173334444',
            'is_active' => true,
        ]);
        $order = Order::create([
            'order_number' => 'ORD-'.uniqid(),
            'order_type' => 'takeaway',
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'customer_id' => $customer->id,
            'subtotal' => 200,
            'total' => 200,
        ]);

        // Completion is refused until the bill is settled.
        $this->actingAs($this->admin)
            ->patchJson("/api/v1/orders/{$order->id}/status", ['status' => 'completed'])
            ->assertStatus(409);

        $this->assertSame(0, (int) $customer->fresh()->visit_count);
    }

    public function test_order_without_customer_never_touches_loyalty(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-'.uniqid(),
            'order_type' => 'takeaway',
            'status' => 'pending',
            'payment_status' => 'paid',
            'subtotal' => 100,
            'total' => 100,
        ]);

        $before = Customer::count();

        $this->actingAs($this->admin)
            ->patchJson("/api/v1/orders/{$order->id}/status", ['status' => 'completed'])
            ->assertStatus(409);

        $this->assertSame($before, Customer::count());
    }

    public function test_customer_responses_expose_derived_tier(): void
    {
        // 5 completed paid orders -> Bronze (5–9 visits).
        $customer = Customer::create([
            'name' => 'Bronze Bound',
            'phone' => '09175556666',
            'is_active' => true,
        ]);
        for ($i = 0; $i < 5; $i++) {
            $order = Order::create([
                'order_number' => 'ORD-'.uniqid(),
                'order_type' => 'takeaway',
                'status' => 'served',
                'payment_status' => 'unpaid',
                'customer_id' => $customer->id,
                'subtotal' => 200,
                'total' => 200,
            ]);
            $this->actingAs($this->admin)
                ->postJson("/api/v1/orders/{$order->id}/payments", [
                    'payment_method' => 'cash',
                    'amount' => 200,
                ])
                ->assertStatus(201);
        }

        $this->assertSame(5, (int) $customer->fresh()->visit_count);

        $res = $this->actingAs($this->admin)->getJson("/api/v1/customers/{$customer->id}");
        $res->assertStatus(200)->assertJsonPath('data.loyalty_tier', 'Bronze');
    }

    // ------------------------------------------------------------------
    // Replenishment requests
    // ------------------------------------------------------------------

    private function ingredient(): Ingredient
    {
        return Ingredient::create([
            'name' => 'Flour '.uniqid(),
            'unit' => 'g',
            'current_stock' => 500,
            'minimum_stock' => 1000,
            'cost_per_unit' => 0.05,
        ]);
    }

    public function test_replenishment_create_and_status_flow(): void
    {
        $ingredient = $this->ingredient();

        $created = $this->actingAs($this->manager)
            ->postJson('/api/v1/inventory/replenishment', [
                'ingredient_id' => $ingredient->id,
                'quantity' => 2000,
                'priority' => 'high',
            ]);
        $created->assertStatus(201)
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonPath('data.priority', 'high');
        $this->assertMatchesRegularExpression('/^RPL-\d{8}-\d{3}$/', $created->json('data.request_number'));

        $id = $created->json('data.id');

        // submitted -> approved -> processing -> fulfilled
        foreach (['approved', 'processing', 'fulfilled'] as $status) {
            $this->actingAs($this->admin)
                ->patchJson("/api/v1/inventory/replenishment/{$id}/status", ['status' => $status])
                ->assertStatus(200)
                ->assertJsonPath('data.status', $status);
        }
    }

    public function test_replenishment_invalid_transition_conflicts(): void
    {
        $ingredient = $this->ingredient();
        $created = $this->actingAs($this->manager)
            ->postJson('/api/v1/inventory/replenishment', [
                'ingredient_id' => $ingredient->id,
                'quantity' => 500,
            ]);
        $id = $created->json('data.id'); // status=submitted

        // submitted -> fulfilled is not allowed directly.
        $this->actingAs($this->admin)
            ->patchJson("/api/v1/inventory/replenishment/{$id}/status", ['status' => 'fulfilled'])
            ->assertStatus(409);
    }

    public function test_inventory_staff_can_create_but_not_approve(): void
    {
        $inventoryStaff = $this->userWithRole('inventory_staff');
        $ingredient = $this->ingredient();

        $created = $this->actingAs($inventoryStaff)
            ->postJson('/api/v1/inventory/replenishment', [
                'ingredient_id' => $ingredient->id,
                'quantity' => 300,
            ]);
        $created->assertStatus(201);

        $this->actingAs($inventoryStaff)
            ->patchJson("/api/v1/inventory/replenishment/{$created->json('data.id')}/status", ['status' => 'approved'])
            ->assertStatus(403);
    }

    public function test_inventory_staff_can_submit_own_draft(): void
    {
        $inventoryStaff = $this->userWithRole('inventory_staff');
        $ingredient = $this->ingredient();

        $created = $this->actingAs($inventoryStaff)
            ->postJson('/api/v1/inventory/replenishment', [
                'ingredient_id' => $ingredient->id,
                'quantity' => 300,
                'status' => 'draft',
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft');

        $this->actingAs($inventoryStaff)
            ->patchJson(
                "/api/v1/inventory/replenishment/{$created->json('data.id')}/status",
                ['status' => 'submitted']
            )
            ->assertOk()
            ->assertJsonPath('data.status', 'submitted');
    }
}
