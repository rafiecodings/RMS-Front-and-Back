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

    public function test_order_cannot_enter_preparing_without_kitchen_ticket(): void
    {
        // An order sitting in 'confirmed' with no KOT must NEVER reach
        // 'preparing' — that would mean the kitchen board is empty while the
        // order claims to be in progress (Order ↔ KOT ↔ Kitchen lockstep).
        // A KOT is created only when an order is confirmed via the endpoint.
        $order = $this->createOrderWithInventory('confirmed', 'unpaid');

        $response = $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$order->id}/status", [
                'status' => 'preparing',
            ]);

        $response->assertStatus(409);
        $this->assertFalse(
            KotTicket::where('order_id', $order->id)->exists(),
            'No KOT should exist for this order.'
        );
        $this->assertEquals('confirmed', $order->refresh()->status);
    }

    public function test_confirm_triggers_inventory_deduction(): void
    {
        $order = $this->createOrderWithInventory('pending', 'unpaid');

        $response = $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$order->id}/status", [
                'status' => 'confirmed',
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

        $response->assertStatus(409);
        $this->assertEquals(0, StockMovement::where('reference_type', 'order')->where('reference_id', $order->id)->count());
    }

    public function test_void_after_deduction_creates_reversal_movement(): void
    {
        $order = $this->createOrderWithInventory('pending', 'unpaid');

        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$order->id}/status", [
                'status' => 'confirmed',
            ])
            ->assertStatus(200);

        $this->assertEquals(1, StockMovement::where('reference_type', 'order')->where('reference_id', $order->id)->count());

        $order->update(['status' => 'confirmed', 'payment_status' => 'unpaid']);

        $response = $this->actingAs($this->user)
            ->postJson("/api/v1/orders/{$order->id}/void", [
                'reason' => 'Test reversal',
            ]);

        $response->assertStatus(200);
        $this->assertEquals(1, StockMovement::where('reference_type', 'order_reversal')->where('reference_id', $order->id)->count());
    }

    public function test_repeated_completion_does_not_double_deduct(): void
    {
        $order = $this->createOrderWithInventory('pending', 'unpaid');

        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$order->id}/status", [
                'status' => 'confirmed',
            ])
            ->assertStatus(200);

        // Subsequent completion attempts are refused and never rededuct.
        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$order->id}/status", [
                'status' => 'completed',
            ])
            ->assertStatus(409);

        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$order->id}/status", [
                'status' => 'completed',
            ])
            ->assertStatus(409);

        $this->assertEquals(1, StockMovement::where('reference_type', 'order')->where('reference_id', $order->id)->count());
    }

    public function test_insufficient_stock_returns_correct_api_error(): void
    {
        RestaurantSetting::create([
            'name' => 'Test Restaurant',
            'allow_negative_inventory' => false,
        ]);

        // Insufficient stock must be caught at CONFIRM (before the kitchen
        // starts), not at payment.
        $order = $this->createOrderWithInventory('pending', 'unpaid', 10);

        $response = $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$order->id}/status", [
                'status' => 'confirmed',
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

    public function test_completion_only_reachable_via_payment(): void
    {
        // A direct status patch to "completed" from any pre-completion state
        // (paid or not) must be rejected — settlement is a payment outcome.
        foreach (['pending', 'confirmed', 'preparing', 'ready', 'served'] as $state) {
            $order = $this->createOrder($state, 'unpaid');
            $response = $this->actingAs($this->user)
                ->patchJson("/api/v1/orders/{$order->id}/status", ['status' => 'completed']);
            $response->assertStatus(409);
            $this->assertEquals($state, Order::find($order->id)->status);
        }

        // Even a served + already-paid order cannot be completed by a patch.
        $paid = $this->createOrder('served', 'paid');
        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$paid->id}/status", ['status' => 'completed'])
            ->assertStatus(409);

        // Successful payment is what completes the order.
        $order = $this->createOrder('served', 'unpaid');
        $this->actingAs($this->user)
            ->postJson("/api/v1/orders/{$order->id}/payments", [
                'payment_method' => 'cash',
                'amount' => 100,
            ])
            ->assertStatus(201);
        $completed = Order::find($order->id);
        $this->assertEquals('completed', $completed->status);
        $this->assertEquals('paid', $completed->payment_status);
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
