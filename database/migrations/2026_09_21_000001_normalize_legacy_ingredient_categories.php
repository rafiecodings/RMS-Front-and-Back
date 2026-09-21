<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Normalize legacy ingredient categories to the canonical
     * App\Enums\IngredientCategory taxonomy.
     *
     * Context: older seed data stored values such as Dairy, Canned, Produce,
     * Baking, Seasoning and Beverage. Category validation now enforces the
     * canonical set, so pre-existing rows with legacy values would fail
     * validation on update. This migration rewrites only classifications
     * that are deterministic from the reviewed ProductionDataSeeder data:
     *
     * - Unambiguous whole-value renames (Dairy, Beverage, Seasoning) apply
     *   to every row carrying that value.
     * - Ambiguous values (Produce, Baking, Canned) are only rewritten when
     *   the ingredient name matches a known deterministic group.
     *
     * Guarantees:
     * - Forward-only data update; no schema change.
     * - Idempotent: re-running matches zero rows on a normalized database.
     * - Touches ONLY the ingredients.category column. IDs, names, stock
     *   levels, costs, recipes, recipe_ingredients and stock_movements are
     *   never modified.
     * - Unknown legacy values or names are left unchanged.
     */
    public function up(): void
    {
        // Unambiguous whole-value renames.
        DB::table('ingredients')->where('category', 'Dairy')->update(['category' => 'Dairy & Eggs']);
        DB::table('ingredients')->where('category', 'Beverage')->update(['category' => 'Beverages']);
        DB::table('ingredients')->where('category', 'Seasoning')->update(['category' => 'Spices & Herbs']);

        // Ambiguous values: rewrite only known deterministic name groups.
        $groups = [
            // Produce rows.
            ['Produce', 'Vegetables', [
                'Garlic', 'Onion (Red)', 'Onion (White)', 'Ginger', 'Tomato',
                'Potato', 'Carrot', 'Bell Pepper', 'Cabbage', 'Kangkong',
                'Green Papaya', 'Radish (Labanos)', 'Pechay', 'Lettuce',
                'Cucumber', 'Corn',
            ]],
            ['Produce', 'Fruits', [
                'Pineapple', 'Mango (Ripe)', 'Mango (Unripe)', 'Watermelon',
                'Coconut (Young)', 'Coconut (Mature)', 'Banana (Saba)',
                'Calamansi (Fresh)',
            ]],
            ['Produce', 'Spices & Herbs', [
                'Chili (Siling Labuyo)', 'Turmeric (Luyang Dilaw)',
            ]],
            // Baking rows.
            ['Baking', 'Pantry', [
                'Flour', 'Sugar (White)', 'Sugar (Brown)',
            ]],
            ['Baking', 'Spices & Herbs', [
                'Vanilla Extract', 'Baking Powder',
            ]],
            // Canned rows.
            ['Canned', 'Pantry', [
                'Corned Beef',
            ]],
            ['Canned', 'Dairy & Eggs', [
                'Evaporated Milk', 'Condensed Milk',
            ]],
        ];

        foreach ($groups as [$legacy, $canonical, $names]) {
            DB::table('ingredients')
                ->where('category', $legacy)
                ->whereIn('name', $names)
                ->update(['category' => $canonical]);
        }
    }

    public function down(): void
    {
        // Intentionally no-op: normalization is many-to-one (e.g. Produce
        // split across Vegetables, Fruits and Spices & Herbs), so canonical
        // categories cannot be safely mapped back to their original legacy
        // classifications.
    }
};
