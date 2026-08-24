<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class OrderItem extends BaseModel
{
    protected $fillable = [
        'order_id',
        'menu_item_id',
        'name',
        'quantity',
        'unit_price',
        'total_price',
        'discount_amount',
        'notes',
        'status',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'discount_amount' => 'decimal:2',
    ];

    public function getTable(): string
    {
        return 'order_items';
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function menuItem(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class);
    }

    public function modifiers(): BelongsToMany
    {
        return $this->belongsToMany(MenuModifier::class, 'order_item_modifiers', 'order_item_id', 'modifier_id')
            ->withPivot('name', 'price');
    }
}
