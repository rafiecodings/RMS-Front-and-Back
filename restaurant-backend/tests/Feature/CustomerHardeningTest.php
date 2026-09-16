<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerHardeningTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create();
        $roleModel = Role::firstOrCreate(['name' => $role], ['display_name' => ucfirst($role), 'module' => 'test']);
        $user->roles()->attach($roleModel);
        return $user;
    }

    private function makeCustomer(array $overrides = []): Customer
    {
        return Customer::create(array_merge(['name' => 'Cust '.uniqid(), 'is_active' => true], $overrides));
    }

    private function makeMenuItem(): \App\Models\MenuItem
    {
        $cat = \App\Models\MenuCategory::create(['name' => 'Cat '.uniqid(), 'slug' => 'cat-'.uniqid()]);
        return \App\Models\MenuItem::create(['category_id' => $cat->id, 'name' => 'Item '.uniqid(), 'slug' => 'item-'.uniqid(), 'price' => 100]);
    }

    public function test_waiter_cashier_read_allowed(): void
    {
        $customer = $this->makeCustomer();
        foreach (['waiter', 'cashier'] as $role) {
            $user = $this->userWithRole($role);
            $this->actingAs($user)->getJson('/api/v1/customers')->assertStatus(200);
            $this->actingAs($user)->getJson("/api/v1/customers/{$customer->id}")->assertStatus(200);
            $this->actingAs($user)->getJson("/api/v1/customers/{$customer->id}/orders")->assertStatus(200);
            $this->actingAs($user)->getJson("/api/v1/customers/{$customer->id}/loyalty")->assertStatus(200);
        }
    }

    public function test_waiter_cashier_write_forbidden(): void
    {
        $customer = $this->makeCustomer();
        foreach (['waiter', 'cashier'] as $role) {
            $user = $this->userWithRole($role);
            $this->actingAs($user)->postJson('/api/v1/customers', ['name' => 'Test'])->assertStatus(403);
            $this->actingAs($user)->putJson("/api/v1/customers/{$customer->id}", ['name' => 'X'])->assertStatus(403);
            $this->actingAs($user)->deleteJson("/api/v1/customers/{$customer->id}")->assertStatus(403);
            $this->actingAs($user)->deleteJson("/api/v1/customers/{$customer->id}/archive")->assertStatus(403);
        }
    }

    public function test_admin_manager_write_allowed(): void
    {
        foreach (['admin', 'manager'] as $role) {
            $user = $this->userWithRole($role);
            $this->actingAs($user)->postJson('/api/v1/customers', ['name' => 'Allow '.$role])->assertStatus(201);
        }
        $customer = $this->makeCustomer();
        $admin = $this->userWithRole('admin');
        $this->actingAs($admin)->putJson("/api/v1/customers/{$customer->id}", ['name' => 'Updated'])->assertStatus(200);
        $this->actingAs($admin)->deleteJson("/api/v1/customers/{$customer->id}/archive")->assertStatus(200);
    }

    public function test_kitchen_inventory_forbidden(): void
    {
        $customer = $this->makeCustomer();
        foreach (['kitchen_staff', 'inventory_staff'] as $role) {
            $user = $this->userWithRole($role);
            $this->actingAs($user)->getJson('/api/v1/customers')->assertStatus(403);
            $this->actingAs($user)->postJson('/api/v1/customers', ['name' => 'X'])->assertStatus(403);
        }
    }

    public function test_archived_customer_blocked_in_new_order(): void
    {
        $admin = $this->userWithRole('admin');
        $active = $this->makeCustomer(['is_active' => true]);
        $archived = $this->makeCustomer(['is_active' => false]);

        $menuItem = $this->makeMenuItem();
        $payloadActive = [
            'order_type' => 'takeaway',
            'customer_id' => $active->id,
            'items' => [['menu_item_id' => $menuItem->id, 'quantity' => 1]],
        ];
        $this->actingAs($admin)->postJson('/api/v1/orders', $payloadActive)->assertStatus(201);

        $payloadArchived = [
            'order_type' => 'takeaway',
            'customer_id' => $archived->id,
            'items' => [['menu_item_id' => $menuItem->id, 'quantity' => 1]],
        ];
        $this->actingAs($admin)->postJson('/api/v1/orders', $payloadArchived)->assertStatus(422)->assertJsonFragment(['Archived customers cannot be assigned to new orders.']);

        $payloadGuest = [
            'order_type' => 'takeaway',
            'items' => [['menu_item_id' => $menuItem->id, 'quantity' => 1]],
        ];
        $this->actingAs($admin)->postJson('/api/v1/orders', $payloadGuest)->assertStatus(201);
    }

    public function test_loyalty_tier_transition_audit(): void
    {
        $admin = $this->userWithRole('admin');
        $this->actingAs($admin);
        $customer = $this->makeCustomer(['name' => 'Athena Dizon', 'visit_count' => 4, 'total_spent' => 0]);

        $customer->recordCompletedVisit(100);

        $this->assertEquals(5, $customer->fresh()->visit_count);
        $this->assertEquals('Bronze', $customer->fresh()->loyaltyTier());
        $log = AuditLog::where('action', 'customer_loyalty_tier_changed')->where('auditable_id', $customer->id)->latest()->first();
        $this->assertNotNull($log);
        $this->assertStringContainsString('Athena Dizon', $log->new_values['description']);
        $this->assertStringContainsString('Member to Bronze', $log->new_values['description']);
        $this->assertEquals($admin->id, $log->user_id);
    }

    public function test_non_threshold_visit_no_audit(): void
    {
        $customer = $this->makeCustomer(['name' => 'NoTier', 'visit_count' => 5]);
        $before = AuditLog::where('action', 'customer_loyalty_tier_changed')->count();
        $customer->recordCompletedVisit(50);
        $this->assertEquals(6, $customer->fresh()->visit_count);
        $this->assertEquals('Bronze', $customer->fresh()->loyaltyTier());
        $after = AuditLog::where('action', 'customer_loyalty_tier_changed')->count();
        $this->assertEquals($before, $after);
    }

    public function test_idempotent_no_duplicate_audit(): void
    {
        $admin = $this->userWithRole('admin');
        $this->actingAs($admin);
        $customer = $this->makeCustomer(['name' => 'Idem', 'visit_count' => 9, 'total_spent' => 0]);
        $customer->recordCompletedVisit(10);
        $this->assertEquals('Silver', $customer->fresh()->loyaltyTier());
        $count = AuditLog::where('action', 'customer_loyalty_tier_changed')->where('auditable_id', $customer->id)->count();
        $this->assertEquals(1, $count);
        // Simulate retry with same order already completed — should not double count because OrderController guard prevents second call, but direct second visit from 10->11 is new threshold? 10 is Silver, 11 stays Silver, so no new log
        $customer->fresh()->recordCompletedVisit(10);
        $this->assertEquals(11, $customer->fresh()->visit_count);
        $this->assertEquals(1, AuditLog::where('action', 'customer_loyalty_tier_changed')->where('auditable_id', $customer->id)->count());
    }
}
