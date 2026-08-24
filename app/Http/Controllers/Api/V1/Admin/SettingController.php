<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\RestaurantSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Fields the UI actually uses. Unused legacy columns
     * (order_prefix, invoice_prefix, *_timeout, low_stock_threshold,
     * business_registration, logo_url) are intentionally not exposed.
     */
    private const EDITABLE = [
        'name' => 'sometimes|string|max:255',
        'description' => 'nullable|string|max:1000',
        'address' => 'nullable|string|max:1000',
        'city' => 'nullable|string|max:255',
        'state' => 'nullable|string|max:255',
        'postal_code' => 'nullable|string|max:50',
        'country' => 'nullable|string|max:100',
        'phone' => 'nullable|string|max:50',
        'email' => 'nullable|email',
        'timezone' => 'nullable|string|max:100',
        'currency' => 'nullable|string|max:10',
        'currency_symbol' => 'nullable|string|max:10',
        'tax_id' => 'nullable|string|max:100',
        // Keyed per weekday: {"monday":{"open":"08:00","close":"22:00","is_closed":false}, ...}
        'opening_hours' => 'nullable|array',
        'default_tax_rate' => 'nullable|numeric|min:0|max:100',
        'default_service_charge' => 'nullable|numeric|min:0|max:100',
        'service_charge_enabled' => 'sometimes|boolean',
        'allow_negative_inventory' => 'sometimes|boolean',
    ];

    public function index(Request $request): JsonResponse
    {
        return $this->success($this->serialize());
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate(self::EDITABLE);

        $settings = RestaurantSetting::first();

        if (! $settings) {
            $settings = RestaurantSetting::create($validated);
        } else {
            $settings->update($validated);
        }

        return $this->success($this->serialize(), 'Settings updated successfully.');
    }

    private function serialize(): array
    {
        $s = RestaurantSetting::first();

        if (! $s) {
            return ['restaurant' => null];
        }

        // Flat contract (no nested "restaurant" wrapper inside data beyond a
        // single stable key so clients can distinguish "unset" from empty).
        return [
            'id' => $s->id,
            'name' => $s->name,
            'description' => $s->description,
            'address' => $s->address,
            'city' => $s->city,
            'state' => $s->state,
            'postal_code' => $s->postal_code,
            'country' => $s->country,
            'phone' => $s->phone,
            'email' => $s->email,
            'timezone' => $s->timezone,
            'currency' => $s->currency,
            'currency_symbol' => $s->currency_symbol,
            'tax_id' => $s->tax_id,
            'opening_hours' => $s->opening_hours,
            'default_tax_rate' => (float) $s->default_tax_rate,
            'default_service_charge' => (float) $s->default_service_charge,
            'service_charge_enabled' => (bool) $s->service_charge_enabled,
            'allow_negative_inventory' => (bool) $s->allow_negative_inventory,
            'updated_at' => $s->updated_at?->toISOString(),
        ];
    }
}
