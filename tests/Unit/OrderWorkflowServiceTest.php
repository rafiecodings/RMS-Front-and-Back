<?php

namespace Tests\Unit;

use App\Exceptions\InsufficientStockException;
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
use App\Services\OrderWorkflowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderWorkflowServiceTest extends TestCase
{
    use RefreshDatabase;

    private OrderWorkflowService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new OrderWorkflowService();
    }

    public function test_create_kot_is_idempotent(): void
    {
        $order = $this->createOrderWithItems();

        $first = $this->service->createKotForOrder($order);
        $second = $this->service->createKotForOrder($order);

        $this->assertEquals($first->id, $second->id);
        $this->assertEquals(1, KotTicket::where('order_id', $order->id)->count());
    }

    public function test_kot_ticket_items_are_copied_from_order_items(): void
    {
        $order = $this->createOrderWithItems();

        $kot = $this->service->createKotForOrder($order);

        $this->assertEquals(2, $kot->items->count());
        $this->assertEquals($order->items[0]->name, $kot->items[0]->name);
        $this->assertEquals($order->items[0]->quantity, $kot->items[0]->quantity);
        $this->assertEquals($order->items[1]->name, $kot->items[1]->name);
        $this->assertEquals($order->items[1]->quantity, $kot->items[1]->quantity);
    }

    public function test_inventory_deduction_creates_outward_stock_movements(): void
    {
        $order = $this->createOrderWithRecipeAndStock('paid');
        $user = User::factory()->create();

        $result = $this->service->deductInventoryForCompletedOrder($order, $user);

        $this->assertTrue($result['deducted']);
        $this->assertEquals(2, count($result['movements']));

        foreach ($result['movements'] as $movement) {
            $this->assertEquals('outward', $movement->type);
            $this->assertEquals('order', $movement->reference_type);
            $this->assertEquals($order->id, $movement->reference_id);
        }
    }

    public function test_recipe_yield_calculation_works_correctly(): void
    {
        $ingredient = Ingredient::create([
            'name' => 'Flour',
            'unit' => 'g',
            'current_stock' => 1000,
            'minimum_stock' => 0,
            'cost_per_unit' => 0.05,
        ]);

        $category = $this->createCategory();

        $menuItem = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Bread',
            'slug' => 'bread-' . uniqid(),
            'price' => 50,
        ]);

        $recipe = Recipe::create([
            'menu_item_id' => $menuItem->id,
            'yield_quantity' => 2,
            'yield_unit' => 'serving',
        ]);

        $recipe->ingredients()->attach($ingredient->id, [
            'quantity' => 100,
            'unit' => 'g',
        ]);

        $order = Order::create([
            'order_number' => 'ORD-001',
            'order_type' => 'dine_in',
            'status' => 'completed',
            'payment_status' => 'paid',
            'subtotal' => 100,
            'total' => 100,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $menuItem->id,
            'name' => 'Bread',
            'quantity' => 4,
            'unit_price' => 50,
            'total_price' => 100,
        ]);

        $user = User::factory()->create();
        $result = $this->service->deductInventoryForCompletedOrder($order, $user);

        $this->assertTrue($result['deducted']);

        $movement = StockMovement::where('ingredient_id', $ingredient->id)->first();
        $this->assertEquals(200.0, (float) $movement->quantity);
    }

    public function test_inventory_deduction_is_idempotent(): void
    {
        $order = $this->createOrderWithRecipeAndStock('paid');
        $user = User::factory()->create();

        $first = $this->service->deductInventoryForCompletedOrder($order, $user);
        $second = $this->service->deductInventoryForCompletedOrder($order, $user);

        $this->assertTrue($first['deducted']);
        $this->assertTrue($second['already_deducted']);
        $this->assertEquals(2, StockMovement::where('reference_type', 'order')->where('reference_id', $order->id)->count());
    }

    public function test_cancelled_order_does_not_deduct(): void
    {
        $order = $this->createOrderWithRecipeAndStock('paid');
        $order->status = 'cancelled';
        $user = User::factory()->create();

        $result = $this->service->deductInventoryForCompletedOrder($order, $user);

        $this->assertTrue($result['skipped']);
        $this->assertEquals(0, StockMovement::where('reference_type', 'order')->where('reference_id', $order->id)->count());
    }

    public function test_insufficient_stock_blocks_deduction_when_negative_disabled(): void
    {
        RestaurantSetting::create([
            'name' => 'Test Restaurant',
            'allow_negative_inventory' => false,
        ]);

        $order = $this->createOrderWithRecipeAndStock('paid', 50);
        $user = User::factory()->create();

        $this->expectException(InsufficientStockException::class);
        $this->service->deductInventoryForCompletedOrder($order, $user);
    }

    public function test_negative_stock_allowed_when_setting_enabled(): void
    {
        RestaurantSetting::create([
            'name' => 'Test Restaurant',
            'allow_negative_inventory' => true,
        ]);

        $order = $this->createOrderWithRecipeAndStock('paid', 50);
        $user = User::factory()->create();

        $result = $this->service->deductInventoryForCompletedOrder($order, $user);

        $this->assertTrue($result['deducted']);
        $this->assertCount(2, $result['movements']);
    }

    public function test_cancelled_deducted_order_creates_reversal_movement(): void
    {
        $order = $this->createOrderWithRecipeAndStock('paid');
        $user = User::factory()->create();

        $this->service->deductInventoryForCompletedOrder($order, $user);

        $ingredient = Ingredient::first();
        $stockBefore = (float) $ingredient->current_stock;

        $result = $this->service->reverseInventoryForCancelledOrder($order, $user);

        $this->assertTrue($result['reversed']);
        $this->assertEquals(2, count($result['movements']));

        foreach ($result['movements'] as $movement) {
            $this->assertEquals('inward', $movement->type);
            $this->assertEquals('order_reversal', $movement->reference_type);
        }

        $ingredient->refresh();
        $this->assertGreaterThan($stockBefore, (float) $ingredient->current_stock);
    }

    public function test_confirm_order_creates_both_deduction_and_kot(): void
    {
        $order = $this->createOrderWithRecipeAndStock('pending', 500);
        $order->status = 'pending';
        $order->save();
        $user = User::factory()->create();

        $result = $this->service->confirmOrder($order, $user);

        $this->assertTrue($result['deducted']);
        $this->assertEquals(2, StockMovement::where('reference_type', 'order')->where('reference_id', $order->id)->count());
        $this->assertEquals(1, KotTicket::where('order_id', $order->id)->count());
    }

    public function test_confirm_order_does_not_double_deduct(): void
    {
        $order = $this->createOrderWithRecipeAndStock('pending', 500);
        $order->status = 'pending';
        $order->save();
        $user = User::factory()->create();

        $this->service->confirmOrder($order, $user);
        $this->service->confirmOrder($order, $user);

        $this->assertEquals(2, StockMovement::where('reference_type', 'order')->where('reference_id', $order->id)->count());
        $this->assertEquals(1, KotTicket::where('order_id', $order->id)->count());
    }

    public function test_confirm_order_skips_when_already_deducted(): void
    {
        $order = $this->createOrderWithRecipeAndStock('pending', 500);
        $order->status = 'pending';
        $order->save();
        $user = User::factory()->create();

        $this->service->confirmOrder($order, $user);
        $this->assertEquals(2, StockMovement::where('reference_type', 'order')->where('reference_id', $order->id)->count());
        $this->assertEquals(1, KotTicket::where('order_id', $order->id)->count());

        $result = $this->service->confirmOrder($order, $user);

        $this->assertTrue($result['already_deducted']);
        $this->assertEquals(2, StockMovement::where('reference_type', 'order')->where('reference_id', $order->id)->count());
        $this->assertEquals(1, KotTicket::where('order_id', $order->id)->count());
    }

    public function test_reversal_is_idempotent(): void
    {
        $order = $this->createOrderWithRecipeAndStock('paid');
        $user = User::factory()->create();

        $this->service->deductInventoryForCompletedOrder($order, $user);

        $first = $this->service->reverseInventoryForCancelledOrder($order, $user);
        $second = $this->service->reverseInventoryForCancelledOrder($order, $user);

        $this->assertTrue($first['reversed']);
        $this->assertTrue($second['already_reversed']);
        $this->assertEquals(2, StockMovement::where('reference_type', 'order_reversal')->where('reference_id', $order->id)->count());
    }

    private function createCategory(): MenuCategory
    {
        return MenuCategory::create([
            'name' => 'Test Category ' . uniqid(),
            'slug' => 'test-category-' . uniqid(),
        ]);
    }

    private function createOrderWithItems(): Order
    {
        $category = $this->createCategory();

        $menuItem1 = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Item 1',
            'slug' => 'item-1-' . uniqid(),
            'price' => 50,
        ]);

        $menuItem2 = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Item 2',
            'slug' => 'item-2-' . uniqid(),
            'price' => 100,
        ]);

        $order = Order::create([
            'order_number' => 'ORD-' . uniqid(),
            'order_type' => 'dine_in',
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'subtotal' => 200,
            'total' => 200,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $menuItem1->id,
            'name' => 'Item 1',
            'quantity' => 2,
            'unit_price' => 50,
            'total_price' => 100,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $menuItem2->id,
            'name' => 'Item 2',
            'quantity' => 1,
            'unit_price' => 100,
            'total_price' => 100,
        ]);

        return $order->refresh();
    }

    private function createOrderWithRecipeAndStock(string $paymentStatus, int $stock = 500): Order
    {
        $ingredient1 = Ingredient::create([
            'name' => 'Rice',
            'unit' => 'g',
            'current_stock' => $stock,
            'minimum_stock' => 0,
            'cost_per_unit' => 0.02,
        ]);

        $ingredient2 = Ingredient::create([
            'name' => 'Chicken',
            'unit' => 'g',
            'current_stock' => $stock,
            'minimum_stock' => 0,
            'cost_per_unit' => 0.10,
        ]);

        $category = $this->createCategory();

        $menuItem1 = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Chicken Rice',
            'slug' => 'chicken-rice-' . uniqid(),
            'price' => 150,
        ]);

        $menuItem2 = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Plain Rice',
            'slug' => 'plain-rice-' . uniqid(),
            'price' => 50,
        ]);

        $recipe1 = Recipe::create([
            'menu_item_id' => $menuItem1->id,
            'yield_quantity' => 1,
            'yield_unit' => 'serving',
        ]);

        $recipe1->ingredients()->attach([
            $ingredient1->id => ['quantity' => 200, 'unit' => 'g'],
            $ingredient2->id => ['quantity' => 150, 'unit' => 'g'],
        ]);

        $recipe2 = Recipe::create([
            'menu_item_id' => $menuItem2->id,
            'yield_quantity' => 1,
            'yield_unit' => 'serving',
        ]);

        $recipe2->ingredients()->attach($ingredient1->id, [
            'quantity' => 150,
            'unit' => 'g',
        ]);

        $order = Order::create([
            'order_number' => 'ORD-' . uniqid(),
            'order_type' => 'dine_in',
            'status' => 'completed',
            'payment_status' => $paymentStatus,
            'subtotal' => 200,
            'total' => 200,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $menuItem1->id,
            'name' => 'Chicken Rice',
            'quantity' => 1,
            'unit_price' => 150,
            'total_price' => 150,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $menuItem2->id,
            'name' => 'Plain Rice',
            'quantity' => 1,
            'unit_price' => 50,
            'total_price' => 50,
        ]);

        return $order->refresh();
    }
}
