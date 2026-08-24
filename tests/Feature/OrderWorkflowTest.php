<?php

namespace Tests\Feature;

use App\Models\Ingredient;
use App\Models\KotTicket;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Recipe;
use App\Models\RestaurantSetting;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->user->roles()->attach(
            \App\Models\Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Admin', 'module' => 'system'])
        );
    }

    public function test_confirmed_status_triggers_kot_creation(): void
    {
        $order = $this->createOrder('pending', 'unpaid');

        $response = $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$order->id}/status", [
                'status' => 'confirmed',
            ]);

        $response->assertStatus(200);
        $this->assertEquals(1, KotTicket::where('order_id', $order->id)->count());
    }

    public function test_completed_paid_triggers_inventory_deduction(): void
    {
        $order = $this->createOrderWithInventory('completed', 'paid');

        $response = $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$order->id}/status", [
                'status' => 'completed',
            ]);

        $response->assertStatus(200);
        $this->assertEquals(1, StockMovement::where('reference_type', 'order')->where('reference_id', $order->id)->count());
    }

    public function test_completed_without_settled_payment_does_not_deduct(): void
    {
        $order = $this->createOrderWithInventory('pending', 'unpaid');

        $response = $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$order->id}/status", [
                'status' => 'completed',
            ]);

        $response->assertStatus(200);
        $this->assertEquals(0, StockMovement::where('reference_type', 'order')->where('reference_id', $order->id)->count());
    }

    public function test_void_after_deduction_creates_reversal_movement(): void
    {
        $order = $this->createOrderWithInventory('completed', 'paid');

        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$order->id}/status", [
                'status' => 'completed',
            ]);

        $this->assertEquals(1, StockMovement::where('reference_type', 'order')->where('reference_id', $order->id)->count());

        $order->update(['status' => 'confirmed', 'payment_status' => 'unpaid']);

        $response = $this->actingAs($this->user)
            ->postJson("/api/v1/orders/{$order->id}/void", [
                'reason' => 'Test reversal',
            ]);

        $response->assertStatus(200);
        $this->assertEquals(1, StockMovement::where('reference_type', 'order_reversal')->where('reference_id', $order->id)->count());
    }

    public function test_repeated_completed_request_does_not_double_deduct(): void
    {
        $order = $this->createOrderWithInventory('completed', 'paid');

        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$order->id}/status", [
                'status' => 'completed',
            ]);

        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$order->id}/status", [
                'status' => 'completed',
            ]);

        $this->assertEquals(1, StockMovement::where('reference_type', 'order')->where('reference_id', $order->id)->count());
    }

    public function test_insufficient_stock_returns_correct_api_error(): void
    {
        RestaurantSetting::create([
            'name' => 'Test Restaurant',
            'allow_negative_inventory' => false,
        ]);

        $order = $this->createOrderWithInventory('completed', 'paid', 10);

        $response = $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$order->id}/status", [
                'status' => 'completed',
            ]);

        $response->assertStatus(422);
        $response->assertJson([
            'success' => false,
        ]);
    }

    public function test_cancelled_order_never_creates_outward_movement(): void
    {
        $order = $this->createOrderWithInventory('pending', 'unpaid');

        $response = $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$order->id}/status", [
                'status' => 'cancelled',
            ]);

        $response->assertStatus(200);
        $this->assertEquals(0, StockMovement::where('reference_type', 'order')->where('reference_id', $order->id)->count());
    }

    private function createOrder(string $status, string $paymentStatus): Order
    {
        return Order::create([
            'order_number' => 'ORD-' . uniqid(),
            'order_type' => 'dine_in',
            'status' => $status,
            'payment_status' => $paymentStatus,
            'subtotal' => 100,
            'total' => 100,
        ]);
    }

    private function createCategory(): MenuCategory
    {
        return MenuCategory::create([
            'name' => 'Test Category ' . uniqid(),
            'slug' => 'test-category-' . uniqid(),
        ]);
    }

    private function createOrderWithInventory(string $status, string $paymentStatus, int $stock = 500): Order
    {
        $ingredient = Ingredient::create([
            'name' => 'Rice',
            'unit' => 'g',
            'current_stock' => $stock,
            'minimum_stock' => 0,
            'cost_per_unit' => 0.02,
        ]);

        $category = $this->createCategory();

        $menuItem = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Rice Bowl',
            'slug' => 'rice-bowl-' . uniqid(),
            'price' => 100,
        ]);

        $recipe = Recipe::create([
            'menu_item_id' => $menuItem->id,
            'yield_quantity' => 1,
            'yield_unit' => 'serving',
        ]);

        $recipe->ingredients()->attach($ingredient->id, [
            'quantity' => 200,
            'unit' => 'g',
        ]);

        $order = Order::create([
            'order_number' => 'ORD-' . uniqid(),
            'order_type' => 'dine_in',
            'status' => $status,
            'payment_status' => $paymentStatus,
            'subtotal' => 100,
            'total' => 100,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $menuItem->id,
            'name' => 'Rice Bowl',
            'quantity' => 1,
            'unit_price' => 100,
            'total_price' => 100,
        ]);

        return $order->refresh();
    }
}
