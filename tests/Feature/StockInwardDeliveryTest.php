<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Ingredient;
use App\Models\Role;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StockInwardDeliveryTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $role): User
    {
        $u = User::factory()->create();
        $u->roles()->attach(Role::firstOrCreate(['name' => $role], ['display_name' => ucfirst($role), 'is_system' => true]));
        return $u->fresh()->load('roles');
    }

    private function ingredient(array $overrides = []): Ingredient
    {
        return Ingredient::create(array_merge([
            'name' => 'Rice '.uniqid(),
            'unit' => 'kg',
            'current_stock' => 10,
            'minimum_stock' => 2,
            'cost_per_unit' => 50,
            'is_active' => true,
        ], $overrides));
    }

    public function test_a_inventory_staff_inward_success(): void
    {
        $staff = $this->userWithRole('inventory_staff');
        $ing = $this->ingredient();
        $this->actingAs($staff)->postJson('/api/v1/inventory/stock/inward', [
            'ingredient_id' => $ing->id,
            'quantity' => 5,
        ])->assertStatus(201);
    }

    public function test_b_inventory_staff_outward_403(): void
    {
        $staff = $this->userWithRole('inventory_staff');
        $ing = $this->ingredient();
        $this->actingAs($staff)->postJson('/api/v1/inventory/stock/outward', [
            'ingredient_id' => $ing->id,
            'quantity' => 1,
        ])->assertStatus(403);
    }

    public function test_c_inventory_staff_adjust_403(): void
    {
        $staff = $this->userWithRole('inventory_staff');
        $ing = $this->ingredient();
        $this->actingAs($staff)->postJson('/api/v1/inventory/stock/adjust', [
            'ingredient_id' => $ing->id,
            'new_stock' => 99,
        ])->assertStatus(403);
    }

    public function test_d_inventory_staff_transfer_403(): void
    {
        $staff = $this->userWithRole('inventory_staff');
        $a = $this->ingredient();
        $b = $this->ingredient();
        $this->actingAs($staff)->postJson('/api/v1/inventory/stock/transfer', [
            'from_ingredient_id' => $a->id,
            'to_ingredient_id' => $b->id,
            'quantity' => 1,
        ])->assertStatus(403);
    }

    public function test_e_admin_inward_success(): void
    {
        $admin = $this->userWithRole('admin');
        $ing = $this->ingredient();
        $this->actingAs($admin)->postJson('/api/v1/inventory/stock/inward', [
            'ingredient_id' => $ing->id,
            'quantity' => 2,
        ])->assertStatus(201);
    }

    public function test_f_manager_inward_success(): void
    {
        $manager = $this->userWithRole('manager');
        $ing = $this->ingredient();
        $this->actingAs($manager)->postJson('/api/v1/inventory/stock/inward', [
            'ingredient_id' => $ing->id,
            'quantity' => 2,
        ])->assertStatus(201);
    }

    public function test_g_inward_increments_stock(): void
    {
        $staff = $this->userWithRole('inventory_staff');
        $ing = $this->ingredient(['current_stock' => 10]);
        $this->actingAs($staff)->postJson('/api/v1/inventory/stock/inward', [
            'ingredient_id' => $ing->id,
            'quantity' => 5,
        ])->assertStatus(201);
        $this->assertEquals(15, (float) $ing->fresh()->current_stock);
    }

    public function test_h_movement_created_by_staff(): void
    {
        $staff = $this->userWithRole('inventory_staff');
        $ing = $this->ingredient();
        $this->actingAs($staff)->postJson('/api/v1/inventory/stock/inward', [
            'ingredient_id' => $ing->id,
            'quantity' => 3,
            'notes' => 'Morning delivery',
        ])->assertStatus(201);
        $movement = StockMovement::where('ingredient_id', $ing->id)->where('type', 'inward')->first();
        $this->assertNotNull($movement);
        $this->assertEquals(3, (float) $movement->quantity);
        $this->assertEquals($staff->id, $movement->created_by);
    }

    public function test_i_omitted_unit_cost_uses_ingredient_cost(): void
    {
        $staff = $this->userWithRole('inventory_staff');
        $ing = $this->ingredient(['cost_per_unit' => 42.5]);
        $this->actingAs($staff)->postJson('/api/v1/inventory/stock/inward', [
            'ingredient_id' => $ing->id,
            'quantity' => 1,
        ])->assertStatus(201);
        $movement = StockMovement::where('ingredient_id', $ing->id)->where('type', 'inward')->first();
        $this->assertEquals(42.5, (float) $movement->unit_cost);
    }

    public function test_j_supplied_unit_cost_snapshot_without_changing_ingredient(): void
    {
        $staff = $this->userWithRole('inventory_staff');
        $ing = $this->ingredient(['cost_per_unit' => 50]);
        $this->actingAs($staff)->postJson('/api/v1/inventory/stock/inward', [
            'ingredient_id' => $ing->id,
            'quantity' => 1,
            'unit_cost' => 60,
        ])->assertStatus(201);
        $movement = StockMovement::where('ingredient_id', $ing->id)->where('type', 'inward')->first();
        $this->assertEquals(60, (float) $movement->unit_cost);
        $this->assertEquals(50, (float) $ing->fresh()->cost_per_unit);
    }

    public function test_k_zero_quantity_422(): void
    {
        $staff = $this->userWithRole('inventory_staff');
        $ing = $this->ingredient();
        $this->actingAs($staff)->postJson('/api/v1/inventory/stock/inward', [
            'ingredient_id' => $ing->id,
            'quantity' => 0,
        ])->assertStatus(422);
    }

    public function test_l_negative_quantity_422(): void
    {
        $staff = $this->userWithRole('inventory_staff');
        $ing = $this->ingredient();
        $this->actingAs($staff)->postJson('/api/v1/inventory/stock/inward', [
            'ingredient_id' => $ing->id,
            'quantity' => -2,
        ])->assertStatus(422);
    }

    public function test_m_inactive_ingredient_422_no_mutation(): void
    {
        $staff = $this->userWithRole('inventory_staff');
        $ing = $this->ingredient(['is_active' => false, 'current_stock' => 10]);
        $this->actingAs($staff)->postJson('/api/v1/inventory/stock/inward', [
            'ingredient_id' => $ing->id,
            'quantity' => 5,
        ])->assertStatus(422);
        $this->assertEquals(10, (float) $ing->fresh()->current_stock);
        $this->assertEquals(0, StockMovement::where('ingredient_id', $ing->id)->count());
    }

    public function test_n_nonexistent_ingredient_422(): void
    {
        $staff = $this->userWithRole('inventory_staff');
        $this->actingAs($staff)->postJson('/api/v1/inventory/stock/inward', [
            'ingredient_id' => '00000000-0000-0000-0000-000000000000',
            'quantity' => 1,
        ])->assertStatus(422);
    }
}
