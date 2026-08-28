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
}
