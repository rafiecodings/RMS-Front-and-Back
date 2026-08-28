<?php

declare(strict_types=1);

namespace App\Models;

class Discount extends BaseModel
{
    protected $fillable = [
        'name',
        'code',
        'type',
        'value',
        'min_order_amount',
        'max_discount_amount',
        'max_uses',
        'used_count',
        'start_date',
        'end_date',
        'is_active',
        'applies_to',
        'description',
        'promotion_kind',
        'eligibility_type',
        'minimum_loyalty_tier',
        'verification_required',
    ];

    protected $casts = [
        'value' => 'decimal:2',
        'min_order_amount' => 'decimal:2',
        'max_discount_amount' => 'decimal:2',
        'max_uses' => 'integer',
        'used_count' => 'integer',
        'is_active' => 'boolean',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'verification_required' => 'boolean',
    ];

    public function getTable(): string
    {
        return 'discounts';
    }
}
