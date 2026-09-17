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

class RecipeContractFixTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $role): User
    {
        $u = User::factory()->create();
        $u->roles()->attach(Role::firstOrCreate(['name' => $role], ['display_name' => ucfirst($role), 'is_system' => true]));
        return $u;
    }

    private function menuItem(): MenuItem
    {
        $cat = MenuCategory::create(['name' => 'Cat '.uniqid(), 'slug' => 'cat-'.uniqid()]);
        return MenuItem::create(['category_id' => $cat->id, 'name' => 'Item '.uniqid(), 'slug' => 'item-'.uniqid(), 'price' => 100]);
    }

    private function ingredient(string $unit = 'kg'): Ingredient
    {
        return Ingredient::create(['name' => 'Ing '.uniqid(), 'unit' => $unit, 'current_stock' => 100, 'minimum_stock' => 10, 'cost_per_unit' => 2.5]);
    }

    public function test_a_admin_can_create_recipe(): void
    {
        $admin = $this->userWithRole('admin');
        $item = $this->menuItem();
        $ing = $this->ingredient('kg');
        $this->actingAs($admin)->postJson('/api/v1/inventory/recipes', [
            'menu_item_id' => $item->id,
            'yield_quantity' => 2,
            'yield_unit' => 'serving',
            'ingredients' => [['ingredient_id' => $ing->id, 'quantity' => 0.5]],
        ])->assertStatus(201);
    }

    public function test_b_manager_can_create_recipe(): void
    {
        $manager = $this->userWithRole('manager');
        $item = $this->menuItem();
        $ing = $this->ingredient('g');
        $this->actingAs($manager)->postJson('/api/v1/inventory/recipes', [
            'menu_item_id' => $item->id,
            'yield_quantity' => 1,
            'yield_unit' => 'serving',
            'ingredients' => [['ingredient_id' => $ing->id, 'quantity' => 1]],
        ])->assertStatus(201);
    }

    public function test_c_inventory_staff_post_403(): void
    {
        $staff = $this->userWithRole('inventory_staff');
        $item = $this->menuItem();
        $ing = $this->ingredient();
        $this->actingAs($staff)->postJson('/api/v1/inventory/recipes', [
            'menu_item_id' => $item->id,
            'yield_quantity' => 1,
            'yield_unit' => 'serving',
            'ingredients' => [['ingredient_id' => $ing->id, 'quantity' => 1]],
        ])->assertStatus(403);
    }

    public function test_de_store_persists_quantity_and_authoritative_unit(): void
    {
        $admin = $this->userWithRole('admin');
        $item = $this->menuItem();
        $ing = $this->ingredient('kg');
        $res = $this->actingAs($admin)->postJson('/api/v1/inventory/recipes', [
            'menu_item_id' => $item->id,
            'yield_quantity' => 1,
            'yield_unit' => 'serving',
            'ingredients' => [['ingredient_id' => $ing->id, 'quantity' => 0.5, 'unit' => 'g']],
        ])->assertStatus(201);
        $recipeId = $res->json('data.id');
        $this->assertDatabaseHas('recipe_ingredients', [
            'recipe_id' => $recipeId,
            'ingredient_id' => $ing->id,
            'quantity' => 0.5,
            'unit' => 'kg',
        ]);
    }

    public function test_f_client_cannot_override_unit(): void
    {
        $admin = $this->userWithRole('admin');
        $item = $this->menuItem();
        $ing = $this->ingredient('L');
        $res = $this->actingAs($admin)->postJson('/api/v1/inventory/recipes', [
            'menu_item_id' => $item->id,
            'yield_quantity' => 1,
            'yield_unit' => 'serving',
            'ingredients' => [['ingredient_id' => $ing->id, 'quantity' => 2, 'unit' => 'pcs']],
        ])->assertStatus(201);
        $this->assertDatabaseHas('recipe_ingredients', [
            'recipe_id' => $res->json('data.id'),
            'ingredient_id' => $ing->id,
            'unit' => 'L',
        ]);
    }

    public function test_g_update_persists_correct_unit(): void
    {
        $admin = $this->userWithRole('admin');
        $item = $this->menuItem();
        $ingA = $this->ingredient('kg');
        $ingB = $this->ingredient('pcs');
        $res = $this->actingAs($admin)->postJson('/api/v1/inventory/recipes', [
            'menu_item_id' => $item->id,
            'yield_quantity' => 1,
            'yield_unit' => 'serving',
            'ingredients' => [['ingredient_id' => $ingA->id, 'quantity' => 1]],
        ])->assertStatus(201);
        $recipeId = $res->json('data.id');
        $this->actingAs($admin)->putJson("/api/v1/inventory/recipes/{$recipeId}", [
            'ingredients' => [['ingredient_id' => $ingB->id, 'quantity' => 3, 'unit' => 'kg']],
        ])->assertStatus(200);
        $this->assertDatabaseHas('recipe_ingredients', [
            'recipe_id' => $recipeId,
            'ingredient_id' => $ingB->id,
            'quantity' => 3,
            'unit' => 'pcs',
        ]);
    }

    public function test_h_duplicate_ingredient_422_not_500(): void
    {
        $admin = $this->userWithRole('admin');
        $item = $this->menuItem();
        $ing = $this->ingredient();
        $this->actingAs($admin)->postJson('/api/v1/inventory/recipes', [
            'menu_item_id' => $item->id,
            'yield_quantity' => 1,
            'yield_unit' => 'serving',
            'ingredients' => [
                ['ingredient_id' => $ing->id, 'quantity' => 1],
                ['ingredient_id' => $ing->id, 'quantity' => 2],
            ],
        ])->assertStatus(422);
    }

    public function test_i_duplicate_menu_item_422(): void
    {
        $admin = $this->userWithRole('admin');
        $item = $this->menuItem();
        $ing = $this->ingredient();
        $payload = [
            'menu_item_id' => $item->id,
            'yield_quantity' => 1,
            'yield_unit' => 'serving',
            'ingredients' => [['ingredient_id' => $ing->id, 'quantity' => 1]],
        ];
        $this->actingAs($admin)->postJson('/api/v1/inventory/recipes', $payload)->assertStatus(201);
        $item2 = $item;
        $this->actingAs($admin)->postJson('/api/v1/inventory/recipes', $payload)->assertStatus(422);
    }

    public function test_j_zero_yield_422(): void
    {
        $admin = $this->userWithRole('admin');
        $item = $this->menuItem();
        $ing = $this->ingredient();
        $this->actingAs($admin)->postJson('/api/v1/inventory/recipes', [
            'menu_item_id' => $item->id,
            'yield_quantity' => 0,
            'yield_unit' => 'serving',
            'ingredients' => [['ingredient_id' => $ing->id, 'quantity' => 1]],
        ])->assertStatus(422);
    }

    public function test_k_delete_soft_deletes_and_menu_item_remains(): void
    {
        $admin = $this->userWithRole('admin');
        $item = $this->menuItem();
        $ing = $this->ingredient();
        $res = $this->actingAs($admin)->postJson('/api/v1/inventory/recipes', [
            'menu_item_id' => $item->id,
            'yield_quantity' => 1,
            'yield_unit' => 'serving',
            'ingredients' => [['ingredient_id' => $ing->id, 'quantity' => 1]],
        ])->assertStatus(201);
        $recipeId = $res->json('data.id');
        $this->actingAs($admin)->deleteJson("/api/v1/inventory/recipes/{$recipeId}")->assertSuccessful();
        $this->assertSoftDeleted('recipes', ['id' => $recipeId]);
        $this->assertDatabaseHas('menu_items', ['id' => $item->id]);
    }
}
