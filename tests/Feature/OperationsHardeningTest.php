<?php

namespace Tests\Feature;

use App\Models\Ingredient;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Recipe;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OperationsHardeningTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->user->roles()->attach(
            Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Admin', 'module' => 'system'])
        );
    }

    private function category(array $attributes = []): MenuCategory
    {
        return MenuCategory::create(array_merge([
            'name' => 'Category '.uniqid(),
            'slug' => 'category-'.uniqid(),
        ], $attributes));
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

    public function test_duplicate_category_name_is_rejected(): void
    {
        $payload = ['name' => 'Unique Category'];

        $this->actingAs($this->user)->postJson('/api/v1/menu/categories', $payload)->assertStatus(201);
        $this->actingAs($this->user)->postJson('/api/v1/menu/categories', $payload)->assertStatus(422);
    }

    public function test_menu_item_requires_positive_price(): void
    {
        $category = $this->category();

        $this->actingAs($this->user)->postJson('/api/v1/menu/items', [
            'category_id' => $category->id,
            'name' => 'Free Item',
            'price' => 0,
        ])->assertStatus(422);

        $this->actingAs($this->user)->postJson('/api/v1/menu/items', [
            'category_id' => $category->id,
            'name' => 'Paid Item',
            'price' => 10.5,
        ])->assertStatus(201);
    }

    public function test_order_rejects_unavailable_menu_item(): void
    {
        $category = $this->category();
        $available = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Available '.uniqid(),
            'slug' => 'available-'.uniqid(),
            'price' => 10,
            'is_available' => true,
        ]);
        $unavailable = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Unavailable '.uniqid(),
            'slug' => 'unavailable-'.uniqid(),
            'price' => 10,
            'is_available' => false,
        ]);

        $this->actingAs($this->user)->postJson('/api/v1/orders', [
            'order_type' => 'dine_in',
            'items' => [['menu_item_id' => $unavailable->id, 'quantity' => 1]],
        ])->assertStatus(422);

        $this->actingAs($this->user)->postJson('/api/v1/orders', [
            'order_type' => 'dine_in',
            'items' => [['menu_item_id' => $available->id, 'quantity' => 1]],
        ])->assertStatus(201);

        $order = Order::create([
            'order_number' => 'ORD-'.uniqid(),
            'order_type' => 'dine_in',
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'subtotal' => 10,
            'total' => 10,
        ]);

        $this->actingAs($this->user)->postJson("/api/v1/orders/{$order->id}/items", [
            'menu_item_id' => $unavailable->id,
            'quantity' => 1,
        ])->assertStatus(422);
    }

    public function test_recipe_rejects_duplicate_ingredient_and_persists_unit(): void
    {
        $category = $this->category();
        $menuItem = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Bread '.uniqid(),
            'slug' => 'bread-'.uniqid(),
            'price' => 20,
        ]);
        $ingredient = $this->ingredient();

        $base = [
            'menu_item_id' => $menuItem->id,
            'yield_quantity' => 1,
            'yield_unit' => 'serving',
        ];

        $this->actingAs($this->user)->postJson('/api/v1/inventory/recipes', array_merge($base, [
            'ingredients' => [
                ['ingredient_id' => $ingredient->id, 'quantity' => 1, 'unit' => 'kg'],
                ['ingredient_id' => $ingredient->id, 'quantity' => 2, 'unit' => 'kg'],
            ],
        ]))->assertStatus(422);

        $this->actingAs($this->user)->postJson('/api/v1/inventory/recipes', array_merge($base, [
            'ingredients' => [
                ['ingredient_id' => $ingredient->id, 'quantity' => 1, 'unit' => 'g'],
            ],
        ]))->assertStatus(201);

        $recipe = Recipe::where('menu_item_id', $menuItem->id)->firstOrFail();
        $this->assertEquals('g', $recipe->ingredients->first()->pivot->unit);
    }

    public function test_purchase_order_receive_is_idempotent_and_state_machine_blocks_invalid_transitions(): void
    {
        $supplier = Supplier::create(['name' => 'Active '.uniqid(), 'is_active' => true]);
        $ingredient = $this->ingredient(['current_stock' => 5]);

        $create = $this->actingAs($this->user)->postJson('/api/v1/inventory/purchase-orders', [
            'supplier_id' => $supplier->id,
            'items' => [['ingredient_id' => $ingredient->id, 'quantity' => 10, 'unit_cost' => 2]],
        ])->assertStatus(201);

        $poId = $create->json('data.id');

        $this->actingAs($this->user)
            ->patchJson("/api/v1/inventory/purchase-orders/{$poId}/status", ['status' => 'confirmed'])
            ->assertStatus(200);

        $stockBefore = Ingredient::find($ingredient->id)->current_stock;

        // Receiving is performed by a different user than the creator (segregation of duties).
        $receiver = User::factory()->create();
        $receiver->roles()->attach(
            Role::firstOrCreate(['name' => 'inventory_staff'], ['display_name' => 'Inventory Staff', 'module' => 'inventory'])
        );

        $this->actingAs($receiver)
            ->patchJson("/api/v1/inventory/purchase-orders/{$poId}/status", ['status' => 'received'])
            ->assertStatus(200);

        $stockAfter = Ingredient::find($ingredient->id)->current_stock;
        $this->assertEquals($stockBefore + 10, $stockAfter);

        // Double-receive must be blocked (terminal status).
        $this->actingAs($receiver)
            ->patchJson("/api/v1/inventory/purchase-orders/{$poId}/status", ['status' => 'received'])
            ->assertStatus(409);

        $this->assertEquals($stockAfter, Ingredient::find($ingredient->id)->current_stock);
    }

    public function test_cancelled_purchase_order_cannot_be_received(): void
    {
        $supplier = Supplier::create(['name' => 'Active2 '.uniqid(), 'is_active' => true]);
        $ingredient = $this->ingredient();

        $create = $this->actingAs($this->user)->postJson('/api/v1/inventory/purchase-orders', [
            'supplier_id' => $supplier->id,
            'items' => [['ingredient_id' => $ingredient->id, 'quantity' => 5, 'unit_cost' => 1]],
        ])->assertStatus(201);

        $poId = $create->json('data.id');

        $this->actingAs($this->user)
            ->patchJson("/api/v1/inventory/purchase-orders/{$poId}/status", ['status' => 'cancelled'])
            ->assertStatus(200);

        $this->actingAs($this->user)
            ->patchJson("/api/v1/inventory/purchase-orders/{$poId}/status", ['status' => 'received'])
            ->assertStatus(409);
    }

    public function test_purchase_order_rejects_inactive_supplier(): void
    {
        $supplier = Supplier::create(['name' => 'Inactive '.uniqid(), 'is_active' => false]);
        $ingredient = $this->ingredient();

        $this->actingAs($this->user)->postJson('/api/v1/inventory/purchase-orders', [
            'supplier_id' => $supplier->id,
            'items' => [['ingredient_id' => $ingredient->id, 'quantity' => 5, 'unit_cost' => 1]],
        ])->assertStatus(422);
    }
}
