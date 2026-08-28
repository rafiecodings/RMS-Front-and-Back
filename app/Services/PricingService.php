<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Customer;
use App\Models\Discount;
use App\Models\MenuItem;
use App\Models\RestaurantSetting;

class PricingService
{
    /**
     * Build a server-priced line item from the database menu item and quantity.
     *
     * The effective unit price is the menu item's DB price plus the price of
     * every linked (requested) modifier. Client-supplied prices are ignored.
     *
     * @return array{
     *     error: string|null,
     *     unit_price: float,
     *     modifier_snapshot: array<string, array{name: string, price: float}>,
     *     total_price: float,
     * }
     */
    public function buildLineItem(MenuItem $menuItem, int $quantity, array $modifierIds = []): array
    {
        if (!$menuItem->is_available) {
            return [
                'error' => 'Menu item is not available.',
                'unit_price' => 0.0,
                'modifier_snapshot' => [],
                'total_price' => 0.0,
            ];
        }

        $requested = array_values(array_unique(array_map('strval', $modifierIds)));

        $snapshot = [];
        $unitPrice = (float) $menuItem->price;

        if ($requested !== []) {
            $linked = $menuItem->modifiers()
                ->whereIn('menu_modifiers.id', $requested)
                ->where('menu_modifiers.is_active', true)
                ->get();

            if ($linked->count() !== count($requested)) {
                return [
                    'error' => 'One or more modifiers are not available for this menu item.',
                    'unit_price' => 0.0,
                    'modifier_snapshot' => [],
                    'total_price' => 0.0,
                ];
            }

            foreach ($linked as $modifier) {
                $price = round((float) $modifier->price, 2);
                $unitPrice += $price;
                $snapshot[$modifier->id] = [
                    'name' => $modifier->name,
                    'price' => $price,
                ];
            }
        }

        $unitPrice = round($unitPrice, 2);
        $totalPrice = round($unitPrice * $quantity, 2);

        if ($totalPrice > 99999999.99) {
            return [
                'error' => 'Item line total exceeds the maximum allowed amount.',
                'unit_price' => 0.0,
                'modifier_snapshot' => [],
                'total_price' => 0.0,
            ];
        }

        return [
            'error' => null,
            'unit_price' => $unitPrice,
            'modifier_snapshot' => $snapshot,
            'total_price' => $totalPrice,
        ];
    }

    /**
     * Resolve a discount by id and/or code against the current subtotal.
     * Validates activity, date range, usage limit and minimum order amount,
     * then computes the discount amount server-side.
     *
     * @return array{discount: Discount|null, amount: float, error: string|null}
     */
    public function resolveDiscount(?string $discountId, ?string $code, float $subtotal): array
    {
        if ($discountId === null && $code === null) {
            return ['discount' => null, 'amount' => 0.0, 'error' => null];
        }

        if ($discountId !== null) {
            $discount = Discount::where('id', $discountId)->first();

            if (!$discount) {
                return ['discount' => null, 'amount' => 0.0, 'error' => 'Invalid discount.'];
            }

            if ($code !== null && $discount->code !== $code) {
                return ['discount' => null, 'amount' => 0.0, 'error' => 'Discount id and code do not match.'];
            }
        } else {
            $discount = Discount::where('code', $code)->first();

            if (!$discount) {
                return ['discount' => null, 'amount' => 0.0, 'error' => 'Invalid discount code.'];
            }
        }

        if (!$discount->is_active) {
            return ['discount' => null, 'amount' => 0.0, 'error' => 'Discount is not active.'];
        }

        if ($discount->start_date && now()->lt($discount->start_date)) {
            return ['discount' => null, 'amount' => 0.0, 'error' => 'Discount has not started yet.'];
        }

        if ($discount->end_date && now()->gt($discount->end_date)) {
            return ['discount' => null, 'amount' => 0.0, 'error' => 'Discount has expired.'];
        }

        if ($discount->max_uses && (int) $discount->used_count >= (int) $discount->max_uses) {
            return ['discount' => null, 'amount' => 0.0, 'error' => 'Discount usage limit reached.'];
        }

        if ($discount->min_order_amount && $subtotal < (float) $discount->min_order_amount) {
            return ['discount' => null, 'amount' => 0.0, 'error' => 'Order subtotal is below the minimum required for this discount.'];
        }

        $amount = $discount->type === 'fixed'
            ? (float) $discount->value
            : round($subtotal * ((float) $discount->value / 100), 2);

        if ($discount->max_discount_amount && $amount > (float) $discount->max_discount_amount) {
            $amount = (float) $discount->max_discount_amount;
        }

        $amount = round(min($amount, $subtotal), 2);

        return ['discount' => $discount, 'amount' => $amount, 'error' => null];
    }

    /**
     * Server-authoritative promotion selection.
     *
     * Evaluates ALL active, date-valid, usage-available, broadly-scoped
     * promotions against the subtotal and returns the SINGLE highest-eligible
     * discount. Promotions are NON-STACKING: only the best one is applied, so
     * e.g. a 10% "Weekend" promo and a 5% "Silver" promo yield 10%, never 15%.
     *
     * @return array{discount: Discount|null, amount: float, error: string|null}
     */
    public function resolveBestPromotion(float $subtotal, ?Customer $customer = null): array
    {
        $candidates = Discount::where('is_active', true)->get();

        $best = null;
        $bestAmount = 0.0;

        foreach ($candidates as $discount) {
            if ($discount->start_date && now()->lt($discount->start_date)) {
                continue;
            }
            if ($discount->end_date && now()->gt($discount->end_date)) {
                continue;
            }
            if ($discount->max_uses !== null && (int) $discount->used_count >= (int) $discount->max_uses) {
                continue;
            }
            if ($discount->min_order_amount && $subtotal < (float) $discount->min_order_amount) {
                continue;
            }
            // Auto-apply only broadly-scoped promotions; targeted ones
            // (specific menu item / category / loyalty tier) must be chosen
            // explicitly via discount_id / discount_code.
            if ($discount->applies_to !== null && $discount->applies_to !== 'all') {
                continue;
            }

            $amount = $discount->type === 'fixed'
                ? (float) $discount->value
                : round($subtotal * ((float) $discount->value / 100), 2);

            if ($discount->max_discount_amount && $amount > (float) $discount->max_discount_amount) {
                $amount = (float) $discount->max_discount_amount;
            }

            $amount = round(min($amount, $subtotal), 2);

            // NON-STACKING: keep only the single highest-eligible promotion.
            if ($amount > $bestAmount) {
                $bestAmount = $amount;
                $best = $discount;
            }
        }

        if ($best === null) {
            return ['discount' => null, 'amount' => 0.0, 'error' => null];
        }

        return ['discount' => $best, 'amount' => $bestAmount, 'error' => null];
    }

    /**
     * Compute order totals from subtotal and discount amount.
     *
     * This is the SINGLE authoritative VAT formula for the whole system
     * (Order Details, POS, Payment, Invoice, Receipt, Tax Report, Sales
     * Report all read the stored tax_amount/total produced here). The policy
     * is driven by Restaurant Settings:
     *
     *   VAT INCLUSIVE (vat_inclusive = true, the production default):
     *     Menu prices already contain VAT, so the guest pays the displayed
     *     gross price. VAT is EXTRACTED, never added:
     *       gross      = subtotal - discount + service_charge
     *       vatable    = gross / (1 + rate/100)
     *       vat        = gross - vatable
     *       total      = gross
     *     Example: ₱378 @ 12% → vatable ₱337.50, VAT ₱40.50, total ₱378.00.
     *
     *   VAT EXCLUSIVE (vat_inclusive = false):
     *       vat   = gross * rate/100
     *       total = gross + vat
     *
     * @return array{subtotal: float, tax_amount: float, discount_amount: float, service_charge: float, total: float}
     */
    public function orderTotals(float $subtotal, float $discountAmount = 0.0): array
    {
        $settings = RestaurantSetting::first();

        $subtotal = round($subtotal, 2);
        $discountAmount = round(min(max(0.0, $discountAmount), $subtotal), 2);

        $serviceChargeEnabled = (bool) ($settings?->service_charge_enabled ?? false);
        $serviceChargeRate = (float) ($settings?->default_service_charge ?? 0);
        $taxRate = max(0.0, (float) ($settings?->default_tax_rate ?? 0));
        $vatInclusive = (bool) ($settings?->vat_inclusive ?? true);

        $serviceCharge = $serviceChargeEnabled ? round($subtotal * ($serviceChargeRate / 100), 2) : 0.0;

        // Guest-facing gross amount for the session.
        $gross = round(max(0.0, $subtotal - $discountAmount + $serviceCharge), 2);

        if ($taxRate > 0 && $gross > 0) {
            if ($vatInclusive) {
                // Extract VAT from the already-inclusive gross price.
                $vatableSales = round($gross / (1 + ($taxRate / 100)), 2);
                $taxAmount = round($gross - $vatableSales, 2);
            } else {
                // Add VAT on top of the exclusive gross price.
                $taxAmount = round($gross * ($taxRate / 100), 2);
            }
        } else {
            $taxAmount = 0.0;
        }

        $total = $vatInclusive ? $gross : round($gross + $taxAmount, 2);

        return [
            'subtotal' => $subtotal,
            'tax_amount' => $taxAmount,
            'discount_amount' => $discountAmount,
            'service_charge' => $serviceCharge,
            'total' => $total,
        ];
    }
}
