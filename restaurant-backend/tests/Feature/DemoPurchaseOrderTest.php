<?php

namespace Tests\Feature;

use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\StockMovement;
use Database\Seeders\CapstoneUatSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoPurchaseOrderTest extends TestCase
{
    use RefreshDatabase;

    private function runDemoPoSeed(): void
    {
        $seeder = new CapstoneUatSeeder();

        $scenarios = new \ReflectionMethod(CapstoneUatSeeder::class, 'seedIngredientScenarios');
        $scenarios->setAccessible(true);
        $scenarios->invoke($seeder);

        $po = new \ReflectionMethod(CapstoneUatSeeder::class, 'seedDemoSupplierAndPurchaseOrder');
        $po->setAccessible(true);
        $po->invoke($seeder);
    }

    public function test_received_po_has_basil_item_and_correct_total(): void
    {
        $this->runDemoPoSeed();

        $po = PurchaseOrder::where('po_number', 'PO-UAT-DEMO-001')->firstOrFail();
        $this->assertSame('received', $po->status);
        $this->assertNotNull($po->received_at);
        $this->assertEquals(80.00, (float) $po->total_amount);

        $items = PurchaseOrderItem::where('purchase_order_id', $po->id)->get();
        $this->assertCount(1, $items);

        $item = $items->first();
        $this->assertSame('Fresh Basil', $item->ingredient->name);
        $this->assertEquals(1000, (float) $item->quantity);
        $this->assertEquals(0.08, (float) $item->unit_cost);
        $this->assertEquals(80.00, (float) $item->total_cost);
        $this->assertEquals(1000, (float) $item->received_quantity);
    }

    public function test_confirmed_po_has_rice_item_and_correct_total(): void
    {
        $this->runDemoPoSeed();

        $po = PurchaseOrder::where('po_number', 'PO-UAT-DEMO-002')->firstOrFail();
        $this->assertSame('confirmed', $po->status);
        $this->assertNull($po->received_at);
        $this->assertEquals(250.00, (float) $po->total_amount);

        $items = PurchaseOrderItem::where('purchase_order_id', $po->id)->get();
        $this->assertCount(1, $items);

        $item = $items->first();
        $this->assertSame('Jasmine Rice', $item->ingredient->name);
        $this->assertEquals(5000, (float) $item->quantity);
        $this->assertEquals(0.05, (float) $item->unit_cost);
        $this->assertEquals(250.00, (float) $item->total_cost);
        $this->assertEquals(0, (float) $item->received_quantity);
    }

    public function test_demo_po_seeding_is_idempotent_with_no_stock_movements(): void
    {
        $this->runDemoPoSeed();
        $this->runDemoPoSeed();

        $this->assertSame(2, PurchaseOrder::whereIn('po_number', ['PO-UAT-DEMO-001', 'PO-UAT-DEMO-002'])->count());
        $this->assertSame(2, PurchaseOrderItem::count());

        $this->assertEquals(80.00, (float) PurchaseOrder::where('po_number', 'PO-UAT-DEMO-001')->firstOrFail()->total_amount);
        $this->assertEquals(250.00, (float) PurchaseOrder::where('po_number', 'PO-UAT-DEMO-002')->firstOrFail()->total_amount);

        $this->assertSame(0, StockMovement::count());
    }
}
