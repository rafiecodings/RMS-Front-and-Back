<?php

declare(strict_types=1);

namespace App\Services;

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
        if (! $menuItem->is_available) {
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

            if (! $discount) {
                return ['discount' => null, 'amount' => 0.0, 'error' => 'Invalid discount.'];
            }

            if ($code !== null && $discount->code !== $code) {
                return ['discount' => null, 'amount' => 0.0, 'error' => 'Discount id and code do not match.'];
            }
        } else {
            $discount = Discount::where('code', $code)->first();

            if (! $discount) {
                return ['discount' => null, 'amount' => 0.0, 'error' => 'Invalid discount code.'];
            }
        }

        if (! $discount->is_active) {
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
     * Compute order totals from subtotal and discount amount.
     *
     * Formula follows the seeded production convention:
     *   service_charge = subtotal * SC rate (when enabled)
     *   tax = (subtotal - discount + service_charge) * tax rate
     *   total = subtotal - discount + service_charge + tax
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
        $taxRate = (float) ($settings?->default_tax_rate ?? 0);

        $serviceCharge = $serviceChargeEnabled ? round($subtotal * ($serviceChargeRate / 100), 2) : 0.0;
        $taxableBase = round($subtotal - $discountAmount + $serviceCharge, 2);
        $taxAmount = round($taxableBase * ($taxRate / 100), 2);
        $total = round(max(0.0, $subtotal - $discountAmount + $serviceCharge + $taxAmount), 2);

        return [
            'subtotal' => $subtotal,
            'tax_amount' => $taxAmount,
            'discount_amount' => $discountAmount,
            'service_charge' => $serviceCharge,
            'total' => $total,
        ];
    }
}
