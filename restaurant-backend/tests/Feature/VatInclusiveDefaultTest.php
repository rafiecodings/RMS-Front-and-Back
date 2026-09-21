<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\RestaurantSetting;
use App\Services\PricingService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VatInclusiveDefaultTest extends TestCase
{
    use RefreshDatabase;

    private function seedDefaultSettings(): void
    {
        $method = new \ReflectionMethod(DatabaseSeeder::class, 'createRestaurantSettings');
        $method->setAccessible(true);
        $method->invoke(new DatabaseSeeder());
    }

    private function pricing(): PricingService
    {
        return app(PricingService::class);
    }

    public function test_fresh_default_setting_is_vat_enabled(): void
    {
        $this->seedDefaultSettings();

        $this->assertTrue((bool) RestaurantSetting::firstOrFail()->vat_enabled);
    }

    public function test_fresh_default_setting_is_vat_inclusive(): void
    {
        $this->seedDefaultSettings();

        $this->assertTrue((bool) RestaurantSetting::firstOrFail()->vat_inclusive);
    }

    public function test_default_tax_rate_is_12(): void
    {
        $this->seedDefaultSettings();

        $this->assertEquals(12.00, (float) RestaurantSetting::firstOrFail()->default_tax_rate);
    }

    public function test_demo_219_order_total_is_219(): void
    {
        $this->seedDefaultSettings();

        $totals = $this->pricing()->orderTotals(219.00, 0);

        $this->assertEquals(219.00, (float) $totals['total']);
    }

    public function test_vatable_sales_is_195_54(): void
    {
        $this->seedDefaultSettings();

        $totals = $this->pricing()->orderTotals(219.00, 0);

        $this->assertEquals(195.54, round((float) $totals['total'] - (float) $totals['tax_amount'], 2));
    }

    public function test_vat_is_23_46(): void
    {
        $this->seedDefaultSettings();

        $totals = $this->pricing()->orderTotals(219.00, 0);

        $this->assertEquals(23.46, (float) $totals['tax_amount']);
    }

    public function test_invoice_copies_same_figures(): void
    {
        $this->seedDefaultSettings();

        $totals = $this->pricing()->orderTotals(219.00, 0);

        $order = \App\Models\Order::create(['order_number' => 'ORD-TEST-VAT-001']);

        $invoice = Invoice::create([
            'order_id' => $order->id,
            'invoice_number' => 'INV-TEST-VAT-001',
            'subtotal' => $totals['subtotal'],
            'tax_amount' => $totals['tax_amount'],
            'discount_amount' => $totals['discount_amount'],
            'service_charge' => $totals['service_charge'],
            'total' => $totals['total'],
            'amount_paid' => $totals['total'],
            'balance' => 0,
            'status' => 'paid',
        ]);

        $this->assertEquals(219.00, (float) $invoice->total);
        $this->assertEquals(23.46, (float) $invoice->tax_amount);
    }

    public function test_explicit_exclusive_mode_still_works(): void
    {
        RestaurantSetting::create([
            'name' => 'Exclusive Test',
            'vat_enabled' => true,
            'vat_inclusive' => false,
            'default_tax_rate' => 12.00,
        ]);

        $totals = $this->pricing()->orderTotals(219.00, 0);

        $this->assertEquals(26.28, (float) $totals['tax_amount']);
        $this->assertEquals(245.28, (float) $totals['total']);
    }

    public function test_disabled_vat_behavior_remains_correct(): void
    {
        RestaurantSetting::create([
            'name' => 'Disabled VAT Test',
            'vat_enabled' => false,
            'vat_inclusive' => true,
            'default_tax_rate' => 12.00,
        ]);

        $totals = $this->pricing()->orderTotals(219.00, 0);

        $this->assertEquals(0.00, (float) $totals['tax_amount']);
        $this->assertEquals(219.00, (float) $totals['total']);
    }

    public function test_sc_pwd_inclusive_totals(): void
    {
        $this->seedDefaultSettings();

        $totals = $this->pricing()->orderTotalsWithStatutoryDiscount(
            112.00,
            0,
            'senior_citizen',
            112.00,
            'OSCA-123456789'
        );

        $this->assertEquals(80.00, (float) $totals['total']);
        $this->assertEquals(0.00, (float) $totals['tax_amount']);
        $this->assertEquals(20.00, (float) $totals['statutory_discount_amount']);
        $this->assertEquals(100.00, (float) $totals['vat_exempt_sales']);
    }
}
