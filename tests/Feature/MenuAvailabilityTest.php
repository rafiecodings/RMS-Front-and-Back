<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Ingredient;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Recipe;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MenuAvailabilityTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $role): User
    {
        $u = User::factory()->create();
        $u->roles()->attach(Role::firstOrCreate(['name' => $role], ['display_name' => ucfirst($role), 'module' => 'system']));
        return $u->fresh()->load('roles');
    }

    private function menuItem(array $overrides = []): MenuItem
    {
        $cat = MenuCategory::create(['name' => 'Cat '.uniqid(), 'slug' => 'cat-'.uniqid(), 'is_active' => $overrides['category_active'] ?? true]);
        unset($overrides['category_active']);
        return MenuItem::create(array_merge([
            'category_id' => $cat->id,
            'name' => 'Item '.uniqid(),
            'slug' => 'item-'.uniqid(),
            'price' => 100,
            'is_available' => true,
        ], $overrides));
    }

    private function withRecipe(MenuItem $item, Ingredient $ing, float $qty = 1): void
    {
        $recipe = Recipe::create(['menu_item_id' => $item->id, 'yield_quantity' => 1, 'yield_unit' => 'serving']);
        $recipe->ingredients()->attach($ing->id, ['quantity' => $qty, 'unit' => 'g']);
    }

    public function test_a_available_succeeds(): void
    {
        $waiter = $this->userWithRole('waiter');
        $item = $this->menuItem(['is_available' => true]);
        $this->actingAs($waiter)->postJson('/api/v1/orders', [
            'order_type' => 'takeaway',
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ])->assertStatus(201);
    }

    public function test_b_unavailable_rejected(): void
    {
        $waiter = $this->userWithRole('waiter');
        $item = $this->menuItem(['is_available' => false]);
        $this->actingAs($waiter)->postJson('/api/v1/orders', [
            'order_type' => 'takeaway',
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ])->assertStatus(422)->assertJsonFragment(['One or more selected menu items are unavailable.']);
    }

    public function test_c_soft_deleted_rejected(): void
    {
        $waiter = $this->userWithRole('waiter');
        $item = $this->menuItem();
        $item->delete();
        $this->actingAs($waiter)->postJson('/api/v1/orders', [
            'order_type' => 'takeaway',
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ])->assertStatus(422);
    }

    public function test_d_inactive_category_rejected(): void
    {
        $waiter = $this->userWithRole('waiter');
        $cat = MenuCategory::create(['name' => 'Inactive Cat', 'slug' => 'inact-'.uniqid(), 'is_active' => false]);
        $item = MenuItem::create(['category_id' => $cat->id, 'name' => 'CatItem', 'slug' => 'catitem-'.uniqid(), 'price' => 100, 'is_available' => true]);
        $this->actingAs($waiter)->postJson('/api/v1/orders', [
            'order_type' => 'takeaway',
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ])->assertStatus(422)->assertJsonFragment(['One or more selected menu items are unavailable.']);
    }

    public function test_e_guest_normal_flow_unaffected(): void
    {
        $waiter = $this->userWithRole('waiter');
        $item = $this->menuItem(['is_available' => true]);
        $this->actingAs($waiter)->postJson('/api/v1/orders', [
            'order_type' => 'takeaway',
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ])->assertStatus(201);
    }

    public function test_f_pos_same_guard(): void
    {
        $cashier = $this->userWithRole('cashier');
        $item = $this->menuItem(['is_available' => false]);
        $this->actingAs($cashier)->postJson('/api/v1/orders', [
            'order_type' => 'takeaway',
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ])->assertStatus(422);
    }

    public function test_g_confirm_succeeds_with_stock(): void
    {
        $admin = $this->userWithRole('admin');
        $ing = Ingredient::create(['name' => 'Ing'.uniqid(), 'unit' => 'g', 'current_stock' => 100, 'minimum_stock' => 10, 'cost_per_unit' => 1]);
        $item = $this->menuItem();
        $this->withRecipe($item, $ing, 1);
        $orderId = $this->actingAs($admin)->postJson('/api/v1/orders', [
            'order_type' => 'takeaway',
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ])->assertStatus(201)->json('data.id');

        $this->actingAs($admin)->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'confirmed'])->assertStatus(200);
        $this->assertEquals(99, (float) $ing->fresh()->current_stock);
    }

    public function test_h_insufficient_before_confirm_rejects(): void
    {
        $admin = $this->userWithRole('admin');
        $ing = Ingredient::create(['name' => 'LowIng'.uniqid(), 'unit' => 'g', 'current_stock' => 1, 'minimum_stock' => 1, 'cost_per_unit' => 1]);
        $item = $this->menuItem();
        $this->withRecipe($item, $ing, 5);
        $orderId = $this->actingAs($admin)->postJson('/api/v1/orders', [
            'order_type' => 'takeaway',
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ])->assertStatus(201)->json('data.id');

        $this->actingAs($admin)->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'confirmed'])->assertStatus(422);
        $this->assertEquals(1, (float) $ing->fresh()->current_stock);
    }

    public function test_i_failed_confirm_no_kot(): void
    {
        $admin = $this->userWithRole('admin');
        $ing = Ingredient::create(['name' => 'KotIng'.uniqid(), 'unit' => 'g', 'current_stock' => 0, 'minimum_stock' => 10, 'cost_per_unit' => 1]);
        $item = $this->menuItem();
        $this->withRecipe($item, $ing, 1);
        $orderId = $this->actingAs($admin)->postJson('/api/v1/orders', [
            'order_type' => 'takeaway',
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ])->assertStatus(201)->json('data.id');

        $this->actingAs($admin)->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'confirmed'])->assertStatus(422);
        $this->assertEquals(0, \App\Models\KotTicket::where('order_id', $orderId)->count());
    }

    public function test_j_failed_confirm_no_decrement(): void
    {
        $admin = $this->userWithRole('admin');
        $ing = Ingredient::create(['name' => 'NoDec'.uniqid(), 'unit' => 'g', 'current_stock' => 0, 'minimum_stock' => 1, 'cost_per_unit' => 1]);
        $item = $this->menuItem();
        $this->withRecipe($item, $ing, 1);
        $orderId = $this->actingAs($admin)->postJson('/api/v1/orders', [
            'order_type' => 'takeaway',
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ])->assertStatus(201)->json('data.id');

        $this->actingAs($admin)->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'confirmed'])->assertStatus(422);
        $this->assertEquals(0, (float) $ing->fresh()->current_stock);
    }

    public function test_k_stock_never_negative(): void
    {
        $admin = $this->userWithRole('admin');
        $ing = Ingredient::create(['name' => 'NegIng'.uniqid(), 'unit' => 'g', 'current_stock' => 0, 'minimum_stock' => 1, 'cost_per_unit' => 1]);
        $item = $this->menuItem();
        $this->withRecipe($item, $ing, 1);
        $orderId = $this->actingAs($admin)->postJson('/api/v1/orders', [
            'order_type' => 'takeaway',
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ])->assertStatus(201)->json('data.id');

        $this->actingAs($admin)->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'confirmed'])->assertStatus(422);
        $this->assertGreaterThanOrEqual(0, (float) $ing->fresh()->current_stock);
    }

    public function test_l_waiter_cashier_cannot_toggle(): void
    {
        $item = $this->menuItem();
        foreach (['waiter', 'cashier'] as $role) {
            $user = $this->userWithRole($role);
            $this->actingAs($user)->patchJson("/api/v1/menu/items/{$item->id}/availability")->assertStatus(403);
        }
    }

    public function test_m_admin_manager_can_toggle(): void
    {
        $item = $this->menuItem(['is_available' => true]);
        foreach (['admin', 'manager'] as $role) {
            $user = $this->userWithRole($role);
            $prev = $item->fresh()->is_available;
            $this->actingAs($user)->patchJson("/api/v1/menu/items/{$item->id}/availability")->assertStatus(200)->assertJsonPath('data.is_available', !$prev);
            $item->refresh();
        }
    }
}
