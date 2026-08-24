<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ForecastTest extends TestCase
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
        $response = $this->getJson('/api/v1/analytics/forecast/'.$this->createMenuItem()->id);

        $response->assertStatus(401);
    }

    public function test_non_admin_user_is_forbidden(): void
    {
        $cashier = User::factory()->create();
        $cashier->roles()->attach(
            Role::firstOrCreate(['name' => 'cashier'], ['display_name' => 'Cashier', 'module' => 'system'])
        );

        $response = $this->actingAs($cashier)
            ->getJson('/api/v1/analytics/forecast/'.$this->createMenuItem()->id);

        $response->assertStatus(403);
    }

    public function test_forecast_returns_naive_predictions(): void
    {
        $menuItem = $this->createMenuItem();
        $this->createCompletedOrder($menuItem);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/analytics/forecast/{$menuItem->id}?horizon=7");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'item_id' => $menuItem->id,
                    'horizon' => 7,
                    'model' => 'naive',
                    'fallback' => true,
                ],
            ])
            ->assertJsonCount(7, 'data.predictions');
    }

    public function test_invalid_horizon_returns_422(): void
    {
        $menuItem = $this->createMenuItem();
        $this->createCompletedOrder($menuItem);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/analytics/forecast/{$menuItem->id}?horizon=45");

        $response->assertStatus(422)
            ->assertJson(['success' => false]);
    }

    public function test_unknown_menu_item_returns_404(): void
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/v1/analytics/forecast/'.Str::uuid());

        $response->assertStatus(404)
            ->assertJson(['success' => false]);
    }

    public function test_no_historical_data_returns_422(): void
    {
        $menuItem = $this->createMenuItem();

        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/analytics/forecast/{$menuItem->id}?horizon=7");

        $response->assertStatus(422)
            ->assertJson(['success' => false]);
    }

    private function createMenuItem(): MenuItem
    {
        $category = MenuCategory::create([
            'name' => 'Forecast Category',
            'slug' => 'forecast-category-'.uniqid(),
        ]);

        return MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Forecast Item',
            'slug' => 'forecast-item-'.uniqid(),
            'price' => 100,
        ]);
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
