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
}
