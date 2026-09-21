<?php

namespace Tests\Feature;

use App\Models\Ingredient;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Recipe;
use App\Models\StockMovement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class IngredientCategoryNormalizationMigrationTest extends TestCase
{
    use RefreshDatabase;

    private function migration(): object
    {
        return require database_path('migrations/2026_09_21_000001_normalize_legacy_ingredient_categories.php');
    }

    private function makeIngredient(string $name, string $category, float $stock = 10): Ingredient
    {
        return Ingredient::create([
            'name' => $name,
            'category' => $category,
            'unit' => 'kg',
            'current_stock' => $stock,
            'minimum_stock' => 2,
            'maximum_stock' => 100,
            'cost_per_unit' => 50,
        ]);
    }

    /**
     * Simulate an upgrade: legacy rows pre-exist, then only the new
     * migration's up() runs against them.
     */
    public function test_normalizes_legacy_rows_and_preserves_everything_else(): void
    {
        $tomato = $this->makeIngredient('Tomato', 'Produce', 30);
        $mango = $this->makeIngredient('Mango (Ripe)', 'Produce', 20);
        $chili = $this->makeIngredient('Chili (Siling Labuyo)', 'Produce', 5);
        $butter = $this->makeIngredient('Butter', 'Dairy', 15);
        $evapMilk = $this->makeIngredient('Evaporated Milk', 'Canned', 80);
        $cornedBeef = $this->makeIngredient('Corned Beef', 'Canned', 60);
        $flour = $this->makeIngredient('Flour', 'Baking', 30);
        $bakingPowder = $this->makeIngredient('Baking Powder', 'Baking', 5);
        $salt = $this->makeIngredient('Salt', 'Seasoning', 10);
        $taro = $this->makeIngredient('Taro Powder', 'Beverage', 6);
        $chicken = $this->makeIngredient('Chicken Breast', 'Meat', 12);
        $mystery = $this->makeIngredient('Mystery Spice', 'Produce', 7);

        $ids = [
            'tomato' => $tomato->id,
            'butter' => $butter->id,
        ];

        // Recipe relationship + stock ledger anchored on the tomato row.
        $category = MenuCategory::create(['name' => 'Test Cat ' . uniqid(), 'slug' => 'test-cat-' . uniqid()]);
        $menuItem = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Test Dish',
            'slug' => 'test-dish-' . uniqid(),
            'price' => 100,
        ]);
        $recipe = Recipe::create([
            'menu_item_id' => $menuItem->id,
            'yield_quantity' => 2,
            'yield_unit' => 'serving',
        ]);
        $recipe->ingredients()->attach($tomato->id, ['quantity' => 100, 'unit' => 'g']);
        StockMovement::create([
            'ingredient_id' => $tomato->id,
            'type' => 'inward',
            'quantity' => 30,
        ]);

        $this->migration()->up();

        // 1-3: unambiguous renames.
        $this->assertSame('Dairy & Eggs', $butter->fresh()->category);
        $this->assertSame('Beverages', $taro->fresh()->category);
        $this->assertSame('Spices & Herbs', $salt->fresh()->category);
        // 4-6: Produce split by deterministic name groups.
        $this->assertSame('Vegetables', $tomato->fresh()->category);
        $this->assertSame('Fruits', $mango->fresh()->category);
        $this->assertSame('Spices & Herbs', $chili->fresh()->category);
        // 7: canned milk follows identity, not the container.
        $this->assertSame('Dairy & Eggs', $evapMilk->fresh()->category);
        $this->assertSame('Pantry', $cornedBeef->fresh()->category);
        // 8-9: Baking split.
        $this->assertSame('Pantry', $flour->fresh()->category);
        $this->assertSame('Spices & Herbs', $bakingPowder->fresh()->category);
        // 10: canonical rows untouched.
        $this->assertSame('Meat', $chicken->fresh()->category);
        // Unknown Produce name left unchanged (never forced into Other).
        $this->assertSame('Produce', $mystery->fresh()->category);

        // 11-12: identity and quantities preserved.
        $this->assertSame($ids['tomato'], $tomato->fresh()->id);
        $this->assertSame($ids['butter'], $butter->fresh()->id);
        $this->assertEquals(30, (float) $tomato->fresh()->current_stock);
        $this->assertEquals(15, (float) $butter->fresh()->current_stock);

        // 13-14: related records untouched.
        $this->assertDatabaseHas('recipe_ingredients', [
            'recipe_id' => $recipe->id,
            'ingredient_id' => $tomato->id,
            'quantity' => 100,
            'unit' => 'g',
        ]);
        $this->assertSame(1, StockMovement::where('ingredient_id', $tomato->id)->count());
        $this->assertEquals(30, (float) StockMovement::where('ingredient_id', $tomato->id)->first()->quantity);

        // 15: idempotent — second run changes nothing.
        $this->migration()->up();
        $this->assertSame('Vegetables', $tomato->fresh()->category);
        $this->assertSame('Produce', $mystery->fresh()->category);
        $this->assertSame(12, Ingredient::count());

        // Mapped rows all land inside the canonical enum set.
        $canonical = ['Meat', 'Seafood', 'Vegetables', 'Fruits', 'Dairy & Eggs', 'Grains', 'Spices & Herbs', 'Condiments', 'Pantry', 'Beverages', 'Other'];
        $mapped = DB::table('ingredients')->whereNotIn('name', ['Mystery Spice'])->pluck('category')->unique();
        foreach ($mapped as $value) {
            $this->assertContains($value, $canonical);
        }
    }
}
