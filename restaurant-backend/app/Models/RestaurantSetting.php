<?php

declare(strict_types=1);

namespace App\Models;

class RestaurantSetting extends BaseModel
{
    protected $fillable = [
        'name',
        'description',
        'address',
        'city',
        'state',
        'postal_code',
        'country',
        'phone',
        'email',
        'website',
        'logo_url',
        'timezone',
        'currency',
        'currency_symbol',
        'tax_id',
        'business_registration',
        'opening_hours',
        'default_tax_rate',
        'default_service_charge',
        'service_charge_enabled',
        'receipt_header',
        'receipt_footer',
        'order_prefix',
        'invoice_prefix',
        'table_reservation_timeout',
        'kitchen_display_timeout',
        'auto_cancel_timeout',
        'allow_negative_inventory',
        'low_stock_threshold',
    ];

    protected $casts = [
        'opening_hours' => 'array',
        'default_tax_rate' => 'decimal:2',
        'default_service_charge' => 'decimal:2',
        'service_charge_enabled' => 'boolean',
        'allow_negative_inventory' => 'boolean',
    ];

    public function getTable(): string
    {
        return 'restaurant_settings';
    }
}
