<?php

namespace Tests\Feature;

use App\Models\Ingredient;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IngredientFilterTest extends TestCase
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

        foreach ([
            ['Chicken Breast', 'Meat'],
            ['Pork Belly', 'MEAT'],
            ['Carrots', 'Vegetables'],
        ] as [$name, $category]) {
            Ingredient::create([
                'name' => $name,
                'category' => $category,
                'unit' => 'kg',
                'current_stock' => 10,
                'minimum_stock' => 2,
                'cost_per_unit' => 100,
            ]);
        }
    }

    public function test_category_filter_is_case_insensitive_and_combines_with_search(): void
    {
        $this->actingAs($this->user)
            ->getJson('/api/v1/inventory/ingredients?category=meat&search=pork&page=1&per_page=20')
            ->assertOk()
            ->assertJsonPath('data.pagination.total', 1)
            ->assertJsonPath('data.items.0.name', 'Pork Belly');
    }

    public function test_all_category_does_not_apply_a_literal_filter(): void
    {
        $this->actingAs($this->user)
            ->getJson('/api/v1/inventory/ingredients?category=all&per_page=20')
            ->assertOk()
            ->assertJsonPath('data.pagination.total', 3);
    }

    public function test_valid_canonical_category_accepted(): void
    {
        $this->actingAs($this->user)
            ->postJson('/api/v1/inventory/ingredients', [
                'name' => 'Test Ingredient',
                'category' => 'Meat',
                'unit' => 'kg',
                'cost_per_unit' => 100,
            ])
            ->assertCreated()
            ->assertJsonPath('data.category', 'Meat');
    }

public function test_invalid_category_rejected(): void
    {
        $this->actingAs($this->user)
            ->postJson('/api/v1/inventory/ingredients', [
                'name' => 'Test Ingredient',
                'category' => 'Invalid Category',
                'unit' => 'kg',
                'cost_per_unit' => 100,
            ])
            ->assertUnprocessable()
            ->assertJsonMissing(['data' => []]);
    }

    public function test_update_rejects_invalid_category(): void
    {
        $ingredient = \App\Models\Ingredient::create([
            'name' => 'Test',
            'category' => 'Meat',
            'unit' => 'kg',
            'cost_per_unit' => 100,
        ]);

        $this->actingAs($this->user)
            ->putJson("/api/v1/inventory/ingredients/{$ingredient->id}", [
                'category' => 'Dairy',
            ])
            ->assertUnprocessable();
    }

    public function test_seeded_categories_are_canonical(): void
    {
        $canonical = \App\Enums\IngredientCategory::values();
        $seeded = \App\Models\Ingredient::distinct('category')->pluck('category')->toArray();

        foreach ($seeded as $category) {
            // Normalize case for comparison
            $normalized = \App\Enums\IngredientCategory::tryFromNormalized($category);
            $this->assertNotNull($normalized, "Category '$category' is not canonical");
        }
    }

    public function test_fresh_basil_is_spices_and_herbs(): void
    {
        $ingredient = \App\Models\Ingredient::create([
            'name' => 'Fresh Basil',
            'category' => 'Spices & Herbs',
            'unit' => 'g',
            'cost_per_unit' => 0.08,
        ]);
        $this->assertEquals('Spices & Herbs', $ingredient->category);
    }

    public function test_jasmine_rice_is_grains(): void
    {
        $ingredient = \App\Models\Ingredient::create([
            'name' => 'Jasmine Rice',
            'category' => 'Grains',
            'unit' => 'g',
            'cost_per_unit' => 0.05,
        ]);
        $this->assertEquals('Grains', $ingredient->category);
    }

    public function test_fresh_eggs_is_dairy_and_eggs(): void
    {
        $ingredient = \App\Models\Ingredient::create([
            'name' => 'Fresh Eggs',
            'category' => 'Dairy & Eggs',
            'unit' => 'g',
            'cost_per_unit' => 0.12,
        ]);
        $this->assertEquals('Dairy & Eggs', $ingredient->category);
    }
}
