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
use App\Models\Role;
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
            Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Admin', 'module' => 'system'])
        );
    }

    /**
     * Helper: create an order in a given status directly (for setup only).
     */
    private function makeOrder(string $status, string $paymentStatus = 'unpaid'): Order
    {
        return Order::create([
            'order_number' => 'ORD-'.uniqid(),
            'order_type' => 'dine_in',
            'status' => $status,
            'payment_status' => $paymentStatus,
            'subtotal' => 100,
            'total' => 100,
        ]);
    }

    /**
     * Helper: create an order with a recipe-driven ingredient so inventory
     * can be deducted/reversed.
     */
    private function makeOrderWithInventory(int $stock = 500): array
    {
        $ingredient = Ingredient::create([
            'name' => 'Rice',
            'unit' => 'g',
            'current_stock' => $stock,
            'minimum_stock' => 0,
            'cost_per_unit' => 0.02,
        ]);

        $category = MenuCategory::create([
            'name' => 'Test Category '.uniqid(),
            'slug' => 'test-category-'.uniqid(),
        ]);

        $menuItem = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Rice Bowl',
            'slug' => 'rice-bowl-'.uniqid(),
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
            'order_number' => 'ORD-'.uniqid(),
            'order_type' => 'dine_in',
            'status' => 'pending',
            'payment_status' => 'unpaid',
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

        return [$order, $ingredient];
    }

    private function patchStatus(Order $order, string $status, array $extra = []): \Illuminate\Testing\TestResponse
    {
        return $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$order->id}/status", array_merge(
                ['status' => $status],
                $extra
            ));
    }

    // ---------------------------------------------------------------------
    // State machine: valid forward transitions
    // ---------------------------------------------------------------------

    public function test_pending_to_confirmed_creates_kot_and_advances_to_preparing(): void
    {
        $order = $this->makeOrder('pending');

        $response = $this->patchStatus($order, 'confirmed');

        $response->assertStatus(200);
        $this->assertEquals(1, KotTicket::where('order_id', $order->id)->count());
        $this->assertEquals('received', KotTicket::where('order_id', $order->id)->first()->status);
        // Confirmation auto-advances the order to preparing (kitchen trigger).
        $this->assertEquals('preparing', $order->fresh()->status);
    }

    public function test_draft_to_confirmed_creates_kot_and_advances_to_preparing(): void
    {
        $order = $this->makeOrder('draft');

        $response = $this->patchStatus($order, 'confirmed');

        $response->assertStatus(200);
        $this->assertEquals(1, KotTicket::where('order_id', $order->id)->count());
        $this->assertEquals('received', KotTicket::where('order_id', $order->id)->first()->status);
        // Confirmation auto-advances the order to preparing (kitchen trigger).
        $this->assertEquals('preparing', $order->fresh()->status);
    }

    public function test_preparing_to_ready(): void
    {
        $order = $this->makeOrder('preparing');

        $response = $this->patchStatus($order, 'ready');

        $response->assertStatus(200);
        $this->assertEquals('ready', $order->fresh()->status);
    }

    public function test_ready_to_served(): void
    {
        $order = $this->makeOrder('ready');

        $response = $this->patchStatus($order, 'served');

        $response->assertStatus(200);
        $this->assertEquals('served', $order->fresh()->status);
    }

    public function test_served_to_completed(): void
    {
        $order = $this->makeOrder('served');

        $response = $this->patchStatus($order, 'completed');

        $response->assertStatus(200);
        $this->assertEquals('completed', $order->fresh()->status);
    }

    public function test_cancellation_from_valid_state(): void
    {
        $order = $this->makeOrder('pending');

        $response = $this->patchStatus($order, 'cancelled', ['notes' => 'Customer left']);

        $response->assertStatus(200);
        $this->assertEquals('cancelled', $order->fresh()->status);
    }

    // ---------------------------------------------------------------------
    // State machine: invalid transitions are rejected with 409
    // ---------------------------------------------------------------------

    public function test_invalid_transition_returns_409(): void
    {
        // draft may only go to confirmed|cancelled
        $this->patchStatus($this->makeOrder('draft'), 'ready')->assertStatus(409);
        $this->patchStatus($this->makeOrder('draft'), 'preparing')->assertStatus(409);
        $this->patchStatus($this->makeOrder('draft'), 'completed')->assertStatus(409);

        // pending may only go to confirmed|cancelled
        $this->patchStatus($this->makeOrder('pending'), 'ready')->assertStatus(409);
        $this->patchStatus($this->makeOrder('pending'), 'preparing')->assertStatus(409);
        $this->patchStatus($this->makeOrder('pending'), 'completed')->assertStatus(409);

        // preparing may not jump to completed or served
        $this->patchStatus($this->makeOrder('preparing'), 'completed')->assertStatus(409);
        $this->patchStatus($this->makeOrder('preparing'), 'served')->assertStatus(409);

        // ready may not go back to preparing and may not skip served
        $this->patchStatus($this->makeOrder('ready'), 'preparing')->assertStatus(409);
        $this->patchStatus($this->makeOrder('ready'), 'completed')->assertStatus(409);

        // served may not go anywhere but completed
        $this->patchStatus($this->makeOrder('served'), 'preparing')->assertStatus(409);
        $this->patchStatus($this->makeOrder('served'), 'confirmed')->assertStatus(409);
        $this->patchStatus($this->makeOrder('served'), 'ready')->assertStatus(409);

        // terminal states are immutable
        $this->patchStatus($this->makeOrder('completed'), 'cancelled')->assertStatus(409);
        $this->patchStatus($this->makeOrder('cancelled'), 'confirmed')->assertStatus(409);
    }

    public function test_noop_transition_returns_409(): void
    {
        $this->patchStatus($this->makeOrder('draft'), 'draft')->assertStatus(409);
        $this->patchStatus($this->makeOrder('pending'), 'pending')->assertStatus(409);
        $this->patchStatus($this->makeOrder('served'), 'served')->assertStatus(409);
        $this->patchStatus($this->makeOrder('completed'), 'completed')->assertStatus(409);
    }

    public function test_duplicate_confirmation_does_not_create_duplicate_kot(): void
    {
        $order = $this->makeOrder('pending');

        $this->patchStatus($order, 'confirmed')->assertStatus(200);
        // After confirmation the order is 'preparing'; a second confirm is invalid.
        $this->patchStatus($order->fresh(), 'confirmed')->assertStatus(409);

        $this->assertEquals(1, KotTicket::where('order_id', $order->id)->count());
    }

    // ---------------------------------------------------------------------
    // KOT synchronization
    // ---------------------------------------------------------------------

    public function test_kot_status_syncs_order_to_ready(): void
    {
        $order = $this->makeOrder('pending');
        $this->patchStatus($order, 'confirmed')->assertStatus(200);

        $kot = KotTicket::where('order_id', $order->id)->first();

        // received -> in_progress does not change the order status
        $this->actingAs($this->user)
            ->patchJson("/api/v1/kot/{$kot->id}/status", ['status' => 'in_progress'])
            ->assertStatus(200);
        $this->assertEquals('preparing', $order->fresh()->status);

        // in_progress -> ready propagates to the parent order
        $this->actingAs($this->user)
            ->patchJson("/api/v1/kot/{$kot->id}/status", ['status' => 'ready'])
            ->assertStatus(200);
        $this->assertEquals('ready', $order->fresh()->status);
    }

    public function test_invalid_kot_transition_returns_409(): void
    {
        $order = $this->makeOrder('pending');
        $this->patchStatus($order, 'confirmed')->assertStatus(200);
        $kot = KotTicket::where('order_id', $order->id)->first();

        // received may not jump to ready directly
        $this->actingAs($this->user)
            ->patchJson("/api/v1/kot/{$kot->id}/status", ['status' => 'ready'])
            ->assertStatus(409);
    }

    // ---------------------------------------------------------------------
    // Inventory safety
    // ---------------------------------------------------------------------

    public function test_completed_paid_triggers_inventory_deduction(): void
    {
        [$order] = $this->makeOrderWithInventory();
        $order->update(['status' => 'ready', 'payment_status' => 'paid']);

        $this->patchStatus($order, 'served')->assertStatus(200);
        $response = $this->patchStatus($order->fresh(), 'completed');

        $response->assertStatus(200);
        $this->assertEquals(1, StockMovement::where('reference_type', 'order')->where('reference_id', $order->id)->count());
    }

    public function test_completed_without_settled_payment_does_not_deduct(): void
    {
        [$order] = $this->makeOrderWithInventory();
        $order->update(['status' => 'ready', 'payment_status' => 'unpaid']);

        $this->patchStatus($order, 'served')->assertStatus(200);
        $response = $this->patchStatus($order->fresh(), 'completed');

        $response->assertStatus(200);
        $this->assertEquals(0, StockMovement::where('reference_type', 'order')->where('reference_id', $order->id)->count());
    }

    public function test_repeated_completed_does_not_double_deduct(): void
    {
        [$order] = $this->makeOrderWithInventory();
        $order->update(['status' => 'ready', 'payment_status' => 'paid']);

        $this->patchStatus($order, 'served')->assertStatus(200);
        $this->patchStatus($order->fresh(), 'completed')->assertStatus(200);
        // Order is now terminal; a second completion attempt is rejected.
        $this->patchStatus($order->fresh(), 'completed')->assertStatus(409);

        $this->assertEquals(1, StockMovement::where('reference_type', 'order')->where('reference_id', $order->id)->count());
    }

    public function test_insufficient_stock_returns_422(): void
    {
        RestaurantSetting::create([
            'name' => 'Test Restaurant',
            'allow_negative_inventory' => false,
        ]);

        [$order] = $this->makeOrderWithInventory(10);
        $order->update(['status' => 'ready', 'payment_status' => 'paid']);

        $this->patchStatus($order, 'served')->assertStatus(200);
        $response = $this->patchStatus($order->fresh(), 'completed');

        $response->assertStatus(422);
        $response->assertJson(['success' => false]);
    }

    public function test_cancelled_order_creates_no_inventory_movements(): void
    {
        [$order] = $this->makeOrderWithInventory();

        $response = $this->patchStatus($order, 'cancelled', ['notes' => 'Test']);

        $response->assertStatus(200);
        $this->assertEquals(0, StockMovement::where('reference_type', 'order')->where('reference_id', $order->id)->count());
        $this->assertEquals(0, StockMovement::where('reference_type', 'order_reversal')->where('reference_id', $order->id)->count());
    }

    private function patchArchive(Order $order)
    {
        return $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$order->id}/archive");
    }

    public function test_archive_completed_order_succeeds(): void
    {
        $order = $this->makeOrder('completed', 'paid');

        $response = $this->patchArchive($order);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'completed');
        $this->assertNotNull($order->fresh()->archived_at);
    }

    public function test_archive_cancelled_order_succeeds(): void
    {
        $order = $this->makeOrder('cancelled');

        $response = $this->patchArchive($order);

        $response->assertStatus(200);
        $this->assertNotNull($order->fresh()->archived_at);
    }

    public function test_archive_active_order_returns_422(): void
    {
        $order = $this->makeOrder('preparing');

        $response = $this->patchArchive($order);

        $response->assertStatus(422);
        $this->assertNull($order->fresh()->archived_at);
    }

    public function test_archived_order_excluded_from_active_index(): void
    {
        $order = $this->makeOrder('completed');
        $order->update(['archived_at' => now()]);

        $response = $this->actingAs($this->user)->getJson('/api/v1/orders');

        $response->assertStatus(200);
        $numbers = collect($response->json('data.items'))->pluck('order_number');
        $this->assertNotContains($order->order_number, $numbers->all());

        $archivedResponse = $this->actingAs($this->user)
            ->getJson('/api/v1/orders?archived=1');
        $archivedNumbers = collect($archivedResponse->json('data.items'))->pluck('order_number');
        $this->assertContains($order->order_number, $archivedNumbers->all());
    }
}
