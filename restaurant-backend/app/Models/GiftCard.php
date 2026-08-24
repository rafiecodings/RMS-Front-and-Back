<?php

declare(strict_types=1);

namespace App\Models;

class GiftCard extends BaseModel
{
    protected $fillable = [
        'code',
        'balance',
        'initial_amount',
        'status',
        'expires_at',
    ];

    protected $casts = [
        'balance' => 'decimal:2',
        'initial_amount' => 'decimal:2',
        'expires_at' => 'datetime',
    ];

    public function getTable(): string
    {
        return 'gift_cards';
    }
}
