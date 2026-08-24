<?php

namespace Tests\Feature;

use App\Models\Ingredient;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Recipe;
use App\Models\Role;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LowStockProjectionTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(
            Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Admin', 'module' => 'system'])
        );
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $this->getJson('/api/v1/analytics/low-stock-projection')->assertStatus(401);
    }

    public function test_projection_returns_forecast_driven_items(): void
    {
        $ingredient = Ingredient::create([
            'name' => 'Rice',
            'unit' => 'g',
            'current_stock' => 500,
            'minimum_stock' => 100,
            'cost_per_unit' => 0.02,
        ]);

        $menuItem = $this->createMenuItemWithRecipe($ingredient);

        $this->createCompletedOrder($menuItem);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/v1/analytics/low-stock-projection');

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonPath('data.horizon_days', 7)
            ->assertJsonCount(1, 'data.items');

        $item = $response->json('data.items.0');
        $this->assertEquals('Rice', $item['name']);
        $this->assertIsNumeric($item['forecast_daily_usage']);
        $this->assertGreaterThan(0, (float) $item['forecast_daily_usage']);
        $this->assertIsInt($item['days_until_stockout']);
        $this->assertContains($item['severity'], ['out_of_stock', 'critical', 'high', 'medium', 'low']);
        $this->assertEquals($menuItem->id, $item['contributors'][0]['menu_item_id']);
    }

    public function test_projection_falls_back_to_history_when_no_forecast_service(): void
    {
        $ingredient = Ingredient::create([
            'name' => 'Flour',
            'unit' => 'g',
            'current_stock' => 300,
            'minimum_stock' => 50,
            'cost_per_unit' => 0.05,
        ]);

        $menuItem = $this->createMenuItemWithRecipe($ingredient);
        $this->createCompletedOrder($menuItem);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/v1/analytics/low-stock-projection');

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonCount(1, 'data.items');

        $item = $response->json('data.items.0');
        $this->assertEquals('Flour', $item['name']);
        $this->assertGreaterThan(0, $item['forecast_daily_usage']);
    }

    public function test_projection_handles_ingredient_without_recipe(): void
    {
        Ingredient::create([
            'name' => 'Salt',
            'unit' => 'g',
            'current_stock' => 50,
            'minimum_stock' => 100,
            'cost_per_unit' => 0.01,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/v1/analytics/low-stock-projection');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data.items');

        $item = $response->json('data.items.0');
        $this->assertEquals('Salt', $item['name']);
        $this->assertEquals(0.0, $item['forecast_daily_usage']);
        $this->assertNull($item['days_until_stockout']);
    }

    public function test_projection_marks_out_of_stock_ingredient(): void
    {
        Ingredient::create([
            'name' => 'Cheese',
            'unit' => 'g',
            'current_stock' => 0,
            'minimum_stock' => 50,
            'cost_per_unit' => 0.1,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/v1/analytics/low-stock-projection');

        $response->assertStatus(200)
            ->assertJsonPath('data.summary.out_of_stock', 1)
            ->assertJsonPath('data.items.0.severity', 'out_of_stock');
    }

    public function test_inventory_analytics_counts_outward_movements(): void
    {
        $ingredient = Ingredient::create([
            'name' => 'Beef',
            'unit' => 'g',
            'current_stock' => 100,
            'minimum_stock' => 20,
            'cost_per_unit' => 0.5,
        ]);

        StockMovement::create([
            'ingredient_id' => $ingredient->id,
            'type' => 'outward',
            'quantity' => 5,
            'unit_cost' => 10,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/v1/analytics/inventory?period=this_month');

        $response->assertStatus(200)
            ->assertJsonPath('data.top_consumed.0.name', 'Beef');

        // Usage cost = quantity x unit cost = 5 x 10 = 50.
        $this->assertEquals(50, $response->json('data.total_usage_cost'));
        $this->assertEquals(5, $response->json('data.top_consumed.0.quantity_used'));
    }

    private function createMenuItemWithoutRecipe(): MenuItem
    {
        $category = MenuCategory::create([
            'name' => 'Trend Category',
            'slug' => 'trend-category-'.uniqid(),
        ]);

        return MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Trend Item',
            'slug' => 'trend-item-'.uniqid(),
            'price' => 100,
        ]);
    }

    private function createMenuItemWithRecipe(Ingredient $ingredient): MenuItem
    {
        $category = MenuCategory::create([
            'name' => 'Projection Category',
            'slug' => 'projection-category-'.uniqid(),
        ]);

        $menuItem = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Projection Item',
            'slug' => 'projection-item-'.uniqid(),
            'price' => 100,
        ]);

        $recipe = Recipe::create([
            'menu_item_id' => $menuItem->id,
            'yield_quantity' => 1,
            'yield_unit' => 'serving',
        ]);

        $recipe->ingredients()->attach($ingredient->id, [
            'quantity' => 50,
            'unit' => $ingredient->unit,
        ]);

        return $menuItem;
    }

    private function createCompletedOrder(MenuItem $menuItem): void
    {
        $order = Order::create([
            'order_number' => 'ORD-'.uniqid(),
            'order_type' => 'takeaway',
            'status' => 'completed',
            'payment_status' => 'paid',
            'subtotal' => 100,
            'total' => 100,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $menuItem->id,
            'name' => $menuItem->name,
            'quantity' => 3,
            'unit_price' => 100,
            'total_price' => 300,
        ]);
    }
}
