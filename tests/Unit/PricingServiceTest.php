<?php

namespace Tests\Unit;

use App\Models\RestaurantSetting;
use App\Services\PricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PricingServiceTest extends TestCase
{
    use RefreshDatabase;

    private function settingWith(array $overrides): void
    {
        RestaurantSetting::create(array_merge([
            'name' => 'VAT Test Restaurant',
            'vat_enabled' => true,
            'vat_inclusive' => true,
            'default_tax_rate' => 12,
            'service_charge_enabled' => false,
            'default_service_charge' => 0,
        ], $overrides));
    }

    public function test_vat_inclusive_extracts_component_do_not_add(): void
    {
        $this->settingWith(['vat_inclusive' => true]);

        $totals = (new PricingService())->orderTotals(378.0, 0.0);

        // ₱378 gross, 12% inclusive → VATable ₱337.50, VAT ₱40.50, total ₱378.
        $this->assertEquals(378.0, $totals['subtotal']);
        $this->assertEquals(40.5, $totals['tax_amount']);
        $this->assertEquals(378.0, $totals['total']);

        $vatable = round($totals['total'] - $totals['tax_amount'], 2);
        $this->assertEquals(337.5, $vatable);
    }

    public function test_vat_exclusive_adds_on_top(): void
    {
        $this->settingWith(['vat_inclusive' => false]);

        $totals = (new PricingService())->orderTotals(378.0, 0.0);

        $this->assertEquals(45.36, $totals['tax_amount']);
        $this->assertEquals(423.36, $totals['total']);
    }

    public function test_vat_inclusive_with_discount(): void
    {
        $this->settingWith(['vat_inclusive' => true]);

        // ₱500 subtotal, ₱50 discount → gross ₱450, VAT ₱48.21, total ₱450.
        $totals = (new PricingService())->orderTotals(500.0, 50.0);

        $this->assertEquals(450.0, $totals['subtotal'] - $totals['discount_amount']);
        $this->assertEquals(48.21, $totals['tax_amount']);
        $this->assertEquals(450.0, $totals['total']);
    }

    public function test_vat_disabled_no_vat_calculation(): void
    {
        $this->settingWith(['vat_enabled' => false]);

        $totals = (new PricingService())->orderTotals(378.0, 0.0);

        $this->assertEquals(378.0, $totals['subtotal']);
        $this->assertEquals(0.0, $totals['tax_amount']);
        $this->assertEquals(378.0, $totals['total']);
    }

    public function test_vat_disabled_with_discount(): void
    {
        $this->settingWith(['vat_enabled' => false]);

        $totals = (new PricingService())->orderTotals(500.0, 50.0);

        $this->assertEquals(500.0, $totals['subtotal']);
        $this->assertEquals(0.0, $totals['tax_amount']);
        $this->assertEquals(450.0, $totals['total']);
    }

    public function test_vat_disabled_with_service_charge(): void
    {
        $this->settingWith([
            'vat_enabled' => false,
            'service_charge_enabled' => true,
            'default_service_charge' => 10,
        ]);

        // ₱378 subtotal, 10% service charge = ₱37.80, no VAT
        $totals = (new PricingService())->orderTotals(378.0, 0.0);

        $this->assertEquals(378.0, $totals['subtotal']);
        $this->assertEquals(37.8, $totals['service_charge']);
        $this->assertEquals(0.0, $totals['tax_amount']);
        $this->assertEquals(415.8, $totals['total']);
    }

    public function test_vat_inclusive_with_service_charge(): void
    {
        $this->settingWith([
            'vat_inclusive' => true,
            'service_charge_enabled' => true,
            'default_service_charge' => 10,
        ]);

        // ₱378 subtotal, 10% service charge = ₱37.80 → gross ₱415.80
        // VAT-inclusive @12% → vatable = 415.80/1.12 = 371.25, VAT = 44.55, total = 415.80
        $totals = (new PricingService())->orderTotals(378.0, 0.0);

        $this->assertEquals(378.0, $totals['subtotal']);
        $this->assertEquals(37.8, $totals['service_charge']);
        $this->assertEquals(44.55, $totals['tax_amount']);
        $this->assertEquals(415.8, $totals['total']);
    }

    public function test_vat_exclusive_with_service_charge(): void
    {
        $this->settingWith([
            'vat_inclusive' => false,
            'service_charge_enabled' => true,
            'default_service_charge' => 10,
        ]);

        // ₱378 subtotal, 10% service charge = ₱37.80 → gross ₱415.80
        // VAT-exclusive @12% → VAT = 49.90, total = 465.70
        $totals = (new PricingService())->orderTotals(378.0, 0.0);

        $this->assertEquals(378.0, $totals['subtotal']);
        $this->assertEquals(37.8, $totals['service_charge']);
        $this->assertEquals(49.9, $totals['tax_amount']);
        $this->assertEquals(465.7, $totals['total']);
    }

    public function test_vat_inclusive_with_discount_and_service_charge(): void
    {
        $this->settingWith([
            'vat_inclusive' => true,
            'service_charge_enabled' => true,
            'default_service_charge' => 10,
        ]);

        // ₱500 subtotal, ₱50 discount → ₱450, 10% service charge on subtotal = ₱50 → gross ₱500
        // VAT-inclusive @12% → vatable = 500/1.12 = 446.43, VAT = 53.57, total = 500
        $totals = (new PricingService())->orderTotals(500.0, 50.0);

        $this->assertEquals(500.0, $totals['subtotal']);
        $this->assertEquals(50.0, $totals['discount_amount']);
        $this->assertEquals(50.0, $totals['service_charge']);
        $this->assertEquals(53.57, $totals['tax_amount']);
        $this->assertEquals(500.0, $totals['total']);
    }

    public function test_rounding_half_cent_consistency(): void
    {
        $this->settingWith(['vat_inclusive' => true]);

        // ₱100 @ 12% inclusive → 100/1.12 = 89.2857... → round to 89.29, VAT = 10.71
        $totals = (new PricingService())->orderTotals(100.0, 0.0);

        $this->assertEquals(100.0, $totals['total']);
        $this->assertEquals(10.71, $totals['tax_amount']);
    }

    // ==================== STATUTORY DISCOUNT TESTS ====================

    public function test_senior_citizen_discount_vat_inclusive(): void
    {
        $this->settingWith(['vat_inclusive' => true]);

        // ₱112 gross VAT-inclusive @ 12%
        // Q_NET = 112/1.12 = 100 (VAT-exempt base)
        // Q_VAT_REMOVED = 112 - 100 = 12
        // SC_DISCOUNT = 100 * 0.20 = 20
        // Total = 112 - 12 - 20 = 80
        // VAT = 0 on fully qualified
        $totals = (new PricingService())->orderTotalsWithStatutoryDiscount(
            112.0,  // subtotal
            0.0,    // no ordinary discount
            'senior_citizen',
            112.0,  // qualified amount = full amount
            'OSCA-12345'
        );

        $this->assertEquals(112.0, $totals['subtotal']);
        $this->assertEquals(0.0, $totals['discount_amount']);
        $this->assertEquals(100.0, $totals['vat_exempt_sales']);
        $this->assertEquals(20.0, $totals['statutory_discount_amount']);
        $this->assertEquals('senior_citizen', $totals['statutory_discount_type']);
        $this->assertEquals(112.0, $totals['qualified_amount']);
        $this->assertEquals(80.0, $totals['total']);
        $this->assertEquals(0.0, $totals['tax_amount']); // VAT = 0 on fully qualified
    }

    public function test_pwd_discount_vat_inclusive(): void
    {
        $this->settingWith(['vat_inclusive' => true]);

        // Same as senior citizen but PWD type
        $totals = (new PricingService())->orderTotalsWithStatutoryDiscount(
            112.0,
            0.0,
            'pwd',
            112.0,
            'PWD-67890'
        );

        $this->assertEquals('pwd', $totals['statutory_discount_type']);
        $this->assertEquals(80.0, $totals['total']);
        $this->assertEquals(0.0, $totals['tax_amount']);
    }

    public function test_partial_qualified_amount_vat_inclusive(): void
    {
        $this->settingWith(['vat_inclusive' => true]);

        // ₱200 subtotal, ₱112 qualified (senior citizen), ₱88 regular
        // Qualified: Q_NET = 112/1.12 = 100, Q_VAT_REMOVED = 12, SC_DISCOUNT = 20
        // Q_DUE = 100 - 20 = 80
        // Regular: N_GROSS = 200 - 112 = 88
        // N_VATABLE = 88/1.12 = 78.57, VAT = 9.43
        // Total = 80 + 88 = 168
        $totals = (new PricingService())->orderTotalsWithStatutoryDiscount(
            200.0,
            0.0,
            'senior_citizen',
            112.0,
            'OSCA-12345'
        );

        $this->assertEquals(200.0, $totals['subtotal']);
        $this->assertEquals(112.0, $totals['qualified_amount']);
        $this->assertEquals(100.0, $totals['vat_exempt_sales']);
        $this->assertEquals(20.0, $totals['statutory_discount_amount']);
        $this->assertEquals(168.0, $totals['total']);
        $this->assertEquals(9.43, $totals['tax_amount']); // VAT only on regular portion
    }

    public function test_qualified_amount_with_ordinary_discount(): void
    {
        $this->settingWith(['vat_inclusive' => true]);

        // ₱500 subtotal, ₱50 ordinary discount → ORDINARY DISCOUNT IGNORED when statutory active
        // ₱200 qualified (senior citizen)
        // Qualified: Q_NET = 200/1.12 = 178.57, Q_VAT_REMOVED = 21.43, SC_DISCOUNT = 35.71
        // Q_DUE = 178.57 - 35.71 = 142.86
        // Regular: N_GROSS = 500 - 200 = 300 (ordinary discount not applied)
        // N_VATABLE = 300/1.12 = 267.86, VAT = 32.14
        // Total = 142.86 + 300 = 442.86
        $totals = (new PricingService())->orderTotalsWithStatutoryDiscount(
            500.0,
            50.0,
            'senior_citizen',
            200.0,
            'OSCA-12345'
        );

        $this->assertEquals(500.0, $totals['subtotal']);
        $this->assertEquals(0.0, $totals['discount_amount']); // Ordinary discount NOT applied when statutory active
        $this->assertEquals(200.0, $totals['qualified_amount']);
        $this->assertEquals(178.57, $totals['vat_exempt_sales']);
        $this->assertEquals(35.71, $totals['statutory_discount_amount']);
        $this->assertEquals(442.86, $totals['total']);
        $this->assertEquals(32.14, $totals['tax_amount']);
    }

    public function test_qualified_amount_exceeds_order_total_rejected(): void
    {
        $this->settingWith(['vat_inclusive' => true]);

        // Qualified amount cannot exceed subtotal - ordinary discount
        $totals = (new PricingService())->orderTotalsWithStatutoryDiscount(
            200.0,
            50.0,
            'senior_citizen',
            200.0, // > 150 (200 - 50)
            'OSCA-12345'
        );

        // The method caps qualified amount at subtotal - discount
        $this->assertEquals(150.0, $totals['qualified_amount']);
    }

    public function test_no_statutory_discount_when_type_null(): void
    {
        $this->settingWith(['vat_inclusive' => true]);

        $totals = (new PricingService())->orderTotalsWithStatutoryDiscount(
            378.0,
            0.0,
            null,
            100.0,
            'OSCA-12345'
        );

        // Should behave like normal orderTotals
        $this->assertEquals(378.0, $totals['subtotal']);
        $this->assertEquals(40.5, $totals['tax_amount']);
        $this->assertEquals(378.0, $totals['total']);
        $this->assertEquals(0.0, $totals['statutory_discount_amount']);
        $this->assertNull($totals['statutory_discount_type']);
    }

    public function test_statutory_discount_vat_disabled(): void
    {
        $this->settingWith(['vat_enabled' => false]);

        // VAT disabled → no VAT, statutory discount still applies
        // ₱112 subtotal, qualified ₱112
        // VAT-exempt base = 112 (no VAT to remove)
        // Statutory discount = 112 * 0.20 = 22.40
        // Total = 112 - 22.40 = 89.60
        $totals = (new PricingService())->orderTotalsWithStatutoryDiscount(
            112.0,
            0.0,
            'senior_citizen',
            112.0,
            'OSCA-12345'
        );

        $this->assertEquals(112.0, $totals['subtotal']);
        $this->assertEquals(112.0, $totals['vat_exempt_sales']);
        $this->assertEquals(22.40, $totals['statutory_discount_amount']);
        $this->assertEquals(89.60, $totals['total']);
        $this->assertEquals(0.0, $totals['tax_amount']);
    }

    public function test_ordinary_sale_unchanged(): void
    {
        $this->settingWith(['vat_inclusive' => true]);

        // Normal order without statutory discount
        $totals = (new PricingService())->orderTotalsWithStatutoryDiscount(
            378.0,
            0.0,
            null,
            0.0,
            null
        );

        $this->assertEquals(378.0, $totals['subtotal']);
        $this->assertEquals(40.5, $totals['tax_amount']);
        $this->assertEquals(378.0, $totals['total']);
        $this->assertEquals(0.0, $totals['statutory_discount_amount']);
    }
}
