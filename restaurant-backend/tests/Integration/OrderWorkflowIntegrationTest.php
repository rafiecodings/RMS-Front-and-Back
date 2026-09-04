<?php

namespace Tests\Integration;

use App\Models\Ingredient;
use App\Models\KotTicket;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Recipe;
use App\Models\Role;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderWorkflowIntegrationTest extends TestCase
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
    }

    public function test_full_order_lifecycle_end_to_end(): void
    {
        [$menuItem, $ingredient] = $this->createMenuItemWithRecipe(500);

        $orderId = $this->createOrderViaApi($menuItem);

        // Confirm → KOT generated AND inventory consumed exactly once.
        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'confirmed'])
            ->assertStatus(200);

        $this->assertEquals(1, KotTicket::where('order_id', $orderId)->count());
        $this->assertEquals(1, StockMovement::where('reference_type', 'order')->where('reference_id', $orderId)->where('type', 'outward')->count());
        $this->assertEquals(300, $ingredient->refresh()->current_stock);

        // Completing while unpaid must be refused; settlement happens via payment.
        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'completed'])
            ->assertStatus(409);

        Order::where('id', $orderId)->update(['status' => 'served']);

        // Inventory already deducted at confirm (exactly once).
        $this->assertEquals(1, StockMovement::where('reference_type', 'order')->where('reference_id', $orderId)->where('type', 'outward')->count());
        $this->assertEquals(300, $ingredient->refresh()->current_stock);

        // Pay the order — must NOT deduct recipe inventory again.
        $this->actingAs($this->user)
            ->postJson("/api/v1/orders/{$orderId}/payments", [
                'payment_method' => 'cash',
                'amount' => 100,
            ])
            ->assertStatus(201);

        $order = Order::find($orderId);
        $this->assertEquals('paid', $order->payment_status);
        $this->assertEquals(1, Payment::where('invoice_id', $order->invoice->id)->count());

        $this->assertEquals(1, StockMovement::where('reference_type', 'order')->where('reference_id', $orderId)->where('type', 'outward')->count());
        $this->assertEquals(300, $ingredient->refresh()->current_stock);

        // Retry payment → 409, still no extra deduction.
        $this->actingAs($this->user)
            ->postJson("/api/v1/orders/{$orderId}/payments", [
                'payment_method' => 'cash',
                'amount' => 100,
            ])
            ->assertStatus(409);

        $this->assertEquals(1, StockMovement::where('reference_type', 'order')->where('reference_id', $orderId)->where('type', 'outward')->count());

        // Re-complete → idempotent no-op (already deducted at confirm).
        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'completed'])
            ->assertStatus(200);

        $movement = StockMovement::where('reference_type', 'order')
            ->where('reference_id', $orderId)
            ->where('type', 'outward')
            ->first();

        $this->assertNotNull($movement);
        $this->assertEquals('outward', $movement->type);
        $this->assertEquals(200.0, (float) $movement->quantity);
        $this->assertEquals(300.0, (float) $ingredient->refresh()->current_stock);

        // Order state is correct
        $order = $order->refresh();
        $this->assertEquals('completed', $order->status);
        $this->assertEquals('paid', $order->payment_status);
        $this->assertEquals(1, $order->items()->count());
    }

    public function test_void_reverses_inventory_correctly(): void
    {
        [$menuItem, $ingredient] = $this->createMenuItemWithRecipe(500);

        $orderId = $this->createOrderViaApi($menuItem);

        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'confirmed'])
            ->assertStatus(200);

        Order::where('id', $orderId)->update(['status' => 'served']);

        $this->actingAs($this->user)
            ->postJson("/api/v1/orders/{$orderId}/payments", [
                'payment_method' => 'cash',
                'amount' => 100,
            ])
            ->assertStatus(201);

        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'completed'])
            ->assertStatus(200);

        $this->assertEquals(300.0, (float) $ingredient->refresh()->current_stock);
        $this->assertEquals(1, StockMovement::where('reference_type', 'order')->where('reference_id', $orderId)->count());

        // Reset to a cancellable state (completed orders cannot be cancelled)
        $order = Order::find($orderId);
        $order->update(['status' => 'confirmed', 'payment_status' => 'unpaid']);

        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'cancelled', 'reason' => 'Integration test reversal'])
            ->assertStatus(200);

        $this->assertEquals(1, StockMovement::where('reference_type', 'order_reversal')->where('reference_id', $orderId)->count());
        $this->assertEquals(500.0, (float) $ingredient->refresh()->current_stock);
        $this->assertEquals('cancelled', Order::find($orderId)->status);
    }

    public function test_order_totals_and_invoice_are_consistent(): void
    {
        [$menuItem] = $this->createMenuItemWithRecipe(500);

        $orderId = $this->createOrderViaApi($menuItem);

        Order::where('id', $orderId)->update(['status' => 'served']);

        $this->actingAs($this->user)
            ->postJson("/api/v1/orders/{$orderId}/payments", [
                'payment_method' => 'card',
                'amount' => 100,
            ])
            ->assertStatus(201);

        $order = Order::with('invoice')->find($orderId);
        $this->assertEquals(100.0, (float) $order->total);
        $this->assertEquals(100.0, (float) $order->subtotal);
        $this->assertNotNull($order->invoice);
        $this->assertEquals(100.0, (float) $order->invoice->total);
        $this->assertEquals(100.0, (float) $order->invoice->amount_paid);
        $this->assertEquals(0.0, (float) $order->invoice->balance);
        $this->assertEquals('paid', $order->invoice->status);
    }

    public function test_confirm_consumes_inventory_once_and_serve_does_not_rededuct(): void
    {
        [$menuItem, $ingredient] = $this->createMenuItemWithRecipe(500);

        $orderId = $this->createOrderViaApi($menuItem);

        // Confirm consumes exactly once.
        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'confirmed'])
            ->assertStatus(200);

        $this->assertEquals(1, StockMovement::where('reference_type', 'order')->where('reference_id', $orderId)->where('type', 'outward')->count());
        $this->assertEquals(300, $ingredient->refresh()->current_stock);

        // Walk the kitchen machine: preparing → ready → served. No rededuction.
        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'preparing'])
            ->assertStatus(200);
        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'ready'])
            ->assertStatus(200);
        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'served'])
            ->assertStatus(200);

        $this->assertEquals(1, StockMovement::where('reference_type', 'order')->where('reference_id', $orderId)->where('type', 'outward')->count());
        $this->assertEquals(300, $ingredient->refresh()->current_stock);
    }

    public function test_insufficient_stock_blocks_confirmation_gracefully(): void
    {
        // Recipe needs 200g but only 50g on hand → confirm must fail before
        // the kitchen ticket is honoured, with no stock movement and the
        // order reverted to pending.
        [$menuItem, $ingredient] = $this->createMenuItemWithRecipe(50);

        $orderId = $this->createOrderViaApi($menuItem);

        $response = $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'confirmed']);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Cannot confirm order: insufficient stock for one or more ingredients.');

        $this->assertEquals(0, StockMovement::where('reference_type', 'order')->where('reference_id', $orderId)->count());
        $this->assertEquals(50, $ingredient->refresh()->current_stock);
        $this->assertEquals('pending', Order::find($orderId)->status);
    }

    private function createMenuItemWithRecipe(int $stock): array
    {
        $ingredient = Ingredient::create([
            'name' => 'Integration Rice',
            'unit' => 'g',
            'current_stock' => $stock,
            'minimum_stock' => 10,
            'cost_per_unit' => 0.02,
        ]);

        $category = MenuCategory::create([
            'name' => 'Integration Category',
            'slug' => 'integration-category-'.uniqid(),
        ]);

        $menuItem = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Integration Rice Bowl',
            'slug' => 'integration-rice-bowl-'.uniqid(),
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

        return [$menuItem, $ingredient];
    }

    private function createOrderViaApi(MenuItem $menuItem): string
    {
        $plan = \App\Models\FloorPlan::firstOrCreate(['name' => 'Test Floor'], ['slug' => 'test-floor-'.uniqid()]);
        $table = \App\Models\Table::firstOrCreate(['number' => 'T-TEST-'.uniqid()], ['floor_plan_id' => $plan->id, 'capacity' => 4, 'status' => 'available', 'is_active' => true]);
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/orders', [
                'order_type' => 'dine_in',
                'table_id' => $table->id,
                'items' => [
                    [
                        'menu_item_id' => $menuItem->id,
                        'quantity' => 1,
                    ],
                ],
            ]);

        $response->assertStatus(201);

        return $response->json('data.id');
    }
}
