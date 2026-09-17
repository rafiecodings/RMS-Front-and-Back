<?php

namespace Tests\Integration;

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Ingredient;
use App\Models\Invoice;
use App\Models\KotTicket;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Recipe;
use App\Models\Reservation;
use App\Models\Role;
use App\Models\StockMovement;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Capstone end-to-end walk of the core restaurant workflow:
 * Customer → Table/Reservation → Order → Confirm → KOT → Kitchen
 * (preparing/ready) → Served → POS Payment → Receipt → Completed →
 * Customer Visit (+1) → Inventory deduction → Tax/Audit → Reports.
 */
class CapstoneEndToEndTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Customer $customer;
    private Table $table;
    private Ingredient $ingredient;
    private MenuItem $menuItem;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->user->roles()->attach(
            Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Admin', 'module' => 'system'])
        );

        $this->customer = Customer::create([
            'name' => 'Juan Dela Cruz',
            'phone' => '09181234567',
            'customer_type' => 'registered',
            'is_active' => true,
        ]);

        $floorPlan = \App\Models\FloorPlan::create([
            'name' => 'E2E Floor',
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $this->table = Table::create([
            'floor_plan_id' => $floorPlan->id,
            'number' => '1',
            'capacity' => 2,
            'status' => 'available',
            'is_active' => true,
        ]);

        $this->ingredient = Ingredient::create([
            'name' => 'E2E Rice',
            'unit' => 'g',
            'current_stock' => 500,
            'minimum_stock' => 10,
            'cost_per_unit' => 0.02,
        ]);

        $category = MenuCategory::create([
            'name' => 'E2E Mains',
            'slug' => 'e2e-mains-'.uniqid(),
        ]);

        $this->menuItem = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'E2E Rice Bowl',
            'slug' => 'e2e-rice-bowl-'.uniqid(),
            'price' => 100,
        ]);

        $recipe = Recipe::create([
            'menu_item_id' => $this->menuItem->id,
            'yield_quantity' => 1,
            'yield_unit' => 'serving',
        ]);

        $recipe->ingredients()->attach($this->ingredient->id, [
            'quantity' => 200,
            'unit' => 'g',
        ]);
    }

    public function test_full_restaurant_workflow_end_to_end(): void
    {
        // --- Reservation (Table/Reservation step) ---
        $reservation = Reservation::create([
            'customer_id' => $this->customer->id,
            'table_id' => $this->table->id,
            'reservation_number' => 'RES-'.uniqid(),
            'guest_name' => $this->customer->name,
            'party_size' => 2,
            'reservation_date' => now()->toDateString(),
            'reservation_time' => '19:00',
            'status' => 'confirmed',
            'source' => 'walk_in',
        ]);
        $this->assertNotNull($reservation->id);

        // --- Order creation (dine-in, linked to table + customer) ---
        $orderId = $this->createOrderViaApi();

        // --- Confirm → KOT generated ---
        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'confirmed'])
            ->assertStatus(200);

        $this->assertEquals(1, KotTicket::where('order_id', $orderId)->count());
        $this->assertTrue(
            AuditLog::where('auditable_type', Order::class)
                ->where('auditable_id', $orderId)
                ->where('action', 'order_confirmed')
                ->exists()
        );

        // --- Kitchen: preparing → ready (KOT reflects kitchen progress) ---
        $kot = KotTicket::where('order_id', $orderId)->first();
        $this->actingAs($this->user)
            ->patchJson("/api/v1/kot/{$kot->id}/status", ['status' => 'in_progress'])
            ->assertStatus(200);
        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'preparing'])
            ->assertStatus(200);
        $this->actingAs($this->user)
            ->patchJson("/api/v1/kot/{$kot->id}/status", ['status' => 'ready'])
            ->assertStatus(200);
        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'ready'])
            ->assertStatus(200);

        // --- Served ---
        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'served'])
            ->assertStatus(200);

        $this->actingAs($this->user)
            ->getJson('/api/v1/kot?status=received,in_progress,ready&per_page=200')
            ->assertOk()
            ->assertJsonPath('data.pagination.total', 0);

        $this->actingAs($this->user)
            ->getJson('/api/v1/orders?status=served&payment_status=unpaid,partial&per_page=200')
            ->assertOk()
            ->assertJsonPath('data.pagination.total', 1)
            ->assertJsonPath('data.items.0.customer.name', 'Juan Dela Cruz')
            ->assertJsonPath('data.items.0.table.number', '1')
            ->assertJsonPath('data.items.0.items_count', 1);

        // --- Completion MUST be refused until the bill is settled ---
        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'completed'])
            ->assertStatus(409);

        // No deduction before payment (deducted atomically at completion).
        $this->assertEquals(
            0,
            StockMovement::where('reference_type', 'order')
                ->where('reference_id', $orderId)
                ->where('type', 'outward')
                ->count()
        );
        $this->assertEquals(500.0, (float) $this->ingredient->refresh()->current_stock);

        // --- POS Payment (cash, full) → auto-completes the order ---
        $total = (float) Order::find($orderId)->total;

        $this->actingAs($this->user)
            ->postJson("/api/v1/orders/{$orderId}/payments", [
                'payment_method' => 'cash',
                'amount' => $total,
            ])
            ->assertStatus(201);

        $order = Order::find($orderId)->refresh();
        $this->assertEquals('completed', $order->status);
        $this->assertEquals('paid', $order->payment_status);

        // Invoice settled
        $invoice = Invoice::where('order_id', $orderId)->first();
        $this->assertNotNull($invoice);
        $invoice->refresh();
        $this->assertEquals('paid', $invoice->status);
        $this->assertEquals(0.0, (float) $invoice->balance);
        $this->assertEquals($total, (float) $invoice->amount_paid);

        // --- Receipt available ---
        $receipt = $this->actingAs($this->user)
            ->getJson("/api/v1/invoices/{$invoice->id}/receipt")
            ->assertStatus(200);
        $receipt
            ->assertJsonPath('data.invoice.order_type', 'dine_in')
            ->assertJsonPath('data.invoice.table', '1')
            ->assertJsonPath('data.invoice.customer_name', 'Juan Dela Cruz')
            ->assertJsonPath('data.items.0.name', 'E2E Rice Bowl')
            ->assertJsonPath('data.payments.0.method', 'cash')
            ->assertJsonPath('data.payments.0.cashier', $this->user->name);
        $this->assertEquals(
            round((float) $invoice->total - (float) $invoice->tax_amount, 2),
            (float) $receipt->json('data.totals.vatable_sales')
        );

        // --- Settled dine-in cover leaves needs_cleaning (canonical lifecycle) ---
        $this->assertEquals('needs_cleaning', Table::find($this->table->id)->status);

        // --- Inventory deducted (200g of rice) ---
        $movement = StockMovement::where('reference_type', 'order')
            ->where('reference_id', $orderId)
            ->where('type', 'outward')
            ->first();
        $this->assertNotNull($movement);
        $this->assertEquals(200.0, (float) $movement->quantity);
        $this->assertEquals(300.0, (float) $this->ingredient->refresh()->current_stock);

        // --- Customer visit recorded (+1, spend added, tier derived) ---
        $customer = $this->customer->fresh();
        $this->assertSame(1, (int) $customer->visit_count);
        $this->assertEquals($total, (float) $customer->total_spent);
        $this->assertNotEmpty($customer->loyaltyTier());

        // --- Audit ledger captured the payment completion ---
        $this->assertTrue(
            AuditLog::where('auditable_type', Order::class)
                ->where('auditable_id', $orderId)
                ->where('action', 'payment_completed')
                ->exists()
        );

        // --- Reports reflect the completed sale ---
        $this->actingAs($this->user)
            ->getJson('/api/v1/reports/sales')
            ->assertStatus(200);

        // --- Re-payment must NOT double count or double deduct ---
        $this->actingAs($this->user)
            ->postJson("/api/v1/orders/{$orderId}/payments", [
                'payment_method' => 'cash',
                'amount' => $total,
            ])
            ->assertStatus(409);

        $this->assertSame(1, (int) $customer->fresh()->visit_count);
        $this->assertEquals(300.0, (float) $this->ingredient->refresh()->current_stock);
    }

    public function test_walk_in_completes_full_workflow_without_customer_or_loyalty_mutation(): void
    {
        $customerCount = Customer::count();
        $created = $this->actingAs($this->user)->postJson('/api/v1/orders', [
            'order_type' => 'dine_in',
            'table_id' => $this->table->id,
            'items' => [['menu_item_id' => $this->menuItem->id, 'quantity' => 1]],
        ]);
        $created->assertCreated()->assertJsonPath('data.customer', null);
        $orderId = $created->json('data.id');

        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'confirmed'])
            ->assertOk();
        $kot = KotTicket::where('order_id', $orderId)->firstOrFail();
        $this->actingAs($this->user)
            ->patchJson("/api/v1/kot/{$kot->id}/status", ['status' => 'in_progress'])
            ->assertOk();
        $this->actingAs($this->user)
            ->patchJson("/api/v1/kot/{$kot->id}/status", ['status' => 'ready'])
            ->assertOk();
        $this->actingAs($this->user)
            ->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'served'])
            ->assertOk();

        $order = Order::findOrFail($orderId);
        $this->actingAs($this->user)
            ->postJson("/api/v1/orders/{$orderId}/payments", [
                'payment_method' => 'cash',
                'amount' => (float) $order->total,
            ])
            ->assertCreated();

        $this->assertNull($order->refresh()->customer_id);
        $this->assertSame($customerCount, Customer::count());
        $this->assertEquals(1, StockMovement::where('reference_type', 'order')->where('reference_id', $orderId)->count());
        // Canonical lifecycle: settled dine-in cover leaves needs_cleaning.
        $this->assertEquals('needs_cleaning', $this->table->refresh()->status);
    }

    private function createOrderViaApi(): string
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/orders', [
                'order_type' => 'dine_in',
                'customer_id' => $this->customer->id,
                'table_id' => $this->table->id,
                'items' => [
                    [
                        'menu_item_id' => $this->menuItem->id,
                        'quantity' => 1,
                    ],
                ],
            ]);

        $response->assertStatus(201);

        return $response->json('data.id');
    }
}
