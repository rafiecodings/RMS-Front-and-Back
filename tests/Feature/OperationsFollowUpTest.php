<?php

namespace Tests\Feature;

use App\Models\Ingredient;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Recipe;
use App\Models\Role;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Wastage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OperationsFollowUpTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(
            Role::firstOrCreate(['name' => $role], ['display_name' => $role, 'module' => 'system'])
        );

        return $user;
    }

    private function ingredient(array $attributes = []): Ingredient
    {
        return Ingredient::create(array_merge([
            'name' => 'Ingredient '.uniqid(),
            'unit' => 'kg',
            'current_stock' => 0,
            'minimum_stock' => 0,
            'cost_per_unit' => 1,
        ], $attributes));
    }

    private function makePurchaseOrder(string $status, ?string $createdBy = null): PurchaseOrder
    {
        $supplier = Supplier::create(['name' => 'Supplier '.uniqid(), 'is_active' => true]);
        $ingredient = $this->ingredient(['current_stock' => 50]);

        $po = PurchaseOrder::create([
            'po_number' => 'PO-'.uniqid(),
            'supplier_id' => $supplier->id,
            'total_amount' => 100,
            'status' => $status,
            'created_by' => $createdBy,
        ]);

        PurchaseOrderItem::create([
            'purchase_order_id' => $po->id,
            'ingredient_id' => $ingredient->id,
            'quantity' => 10,
            'unit' => 'kg',
            'unit_cost' => 1,
            'total_cost' => 10,
        ]);

        return $po;
    }

    public function test_confirm_requires_manager_or_admin(): void
    {
        $inventoryStaff = $this->userWithRole('inventory_staff');
        $admin = $this->userWithRole('admin');
        $po = $this->makePurchaseOrder('pending');

        $this->actingAs($inventoryStaff)
            ->patchJson("/api/v1/inventory/purchase-orders/{$po->id}/status", ['status' => 'confirmed'])
            ->assertStatus(403);

        $this->actingAs($admin)
            ->patchJson("/api/v1/inventory/purchase-orders/{$po->id}/status", ['status' => 'confirmed'])
            ->assertStatus(200);

        $this->assertEquals('confirmed', PurchaseOrder::find($po->id)->status);
    }

    public function test_creator_cannot_receive_their_own_purchase_order(): void
    {
        $creator = $this->userWithRole('inventory_staff');
        $receiver = $this->userWithRole('inventory_staff');
        $admin = $this->userWithRole('admin');
        $po = $this->makePurchaseOrder('pending', $creator->id);

        $this->actingAs($admin)
            ->patchJson("/api/v1/inventory/purchase-orders/{$po->id}/status", ['status' => 'confirmed'])
            ->assertStatus(200);

        $this->actingAs($creator)
            ->patchJson("/api/v1/inventory/purchase-orders/{$po->id}/status", ['status' => 'received'])
            ->assertStatus(403);

        $ingredient = PurchaseOrder::find($po->id)->items->first()->ingredient;
        $stockBefore = $ingredient->current_stock;

        $this->actingAs($receiver)
            ->patchJson("/api/v1/inventory/purchase-orders/{$po->id}/status", ['status' => 'received'])
            ->assertStatus(200);

        $this->assertEquals($stockBefore + 10, Ingredient::find($ingredient->id)->current_stock);
    }

    public function test_wastage_is_distinct_movement_and_prevents_negative_stock(): void
    {
        $admin = $this->userWithRole('admin');
        $ingredient = $this->ingredient(['current_stock' => 10]);

        $this->actingAs($admin)->postJson('/api/v1/inventory/wastage', [
            'ingredient_id' => $ingredient->id,
            'quantity' => 3,
            'reason' => 'Spoiled',
        ])->assertStatus(201);

        $this->assertEquals(7, Ingredient::find($ingredient->id)->current_stock);
        $this->assertDatabaseHas('stock_movements', [
            'ingredient_id' => $ingredient->id,
            'type' => 'wastage',
            'quantity' => 3,
        ]);

        $this->actingAs($admin)->postJson('/api/v1/inventory/wastage', [
            'ingredient_id' => $ingredient->id,
            'quantity' => 50,
            'reason' => 'Spoiled',
        ])->assertStatus(422);

        $this->assertEquals(7, Ingredient::find($ingredient->id)->current_stock);
        $this->assertDatabaseCount('wastage', 1);
    }

    public function test_recipe_returns_stored_recipe_unit_not_ingredient_base_unit(): void
    {
        $admin = $this->userWithRole('admin');
        $category = MenuCategory::create(['name' => 'Cat '.uniqid(), 'slug' => 'cat-'.uniqid()]);
        $menuItem = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Dish '.uniqid(),
            'slug' => 'dish-'.uniqid(),
            'price' => 20,
        ]);
        $ingredient = $this->ingredient(['unit' => 'kg']);

        $create = $this->actingAs($admin)->postJson('/api/v1/inventory/recipes', [
            'menu_item_id' => $menuItem->id,
            'yield_quantity' => 1,
            'yield_unit' => 'serving',
            'ingredients' => [
                ['ingredient_id' => $ingredient->id, 'quantity' => 0.2, 'unit' => 'g'],
            ],
        ])->assertStatus(201);

        $recipeId = $create->json('data.id');

        $show = $this->actingAs($admin)
            ->getJson("/api/v1/inventory/recipes/{$recipeId}")
            ->assertStatus(200);

        $this->assertEquals('g', $show->json('data.ingredients.0.unit'));
    }
}
