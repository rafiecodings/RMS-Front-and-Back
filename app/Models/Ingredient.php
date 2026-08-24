<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Ingredient extends BaseModel
{
    protected $fillable = [
        'name',
        'sku',
        'category',
        'unit',
        'current_stock',
        'minimum_stock',
        'maximum_stock',
        'cost_per_unit',
        'supplier_id',
        'storage_location',
        'is_active',
    ];

    protected $casts = [
        'current_stock' => 'decimal:3',
        'minimum_stock' => 'decimal:3',
        'maximum_stock' => 'decimal:3',
        'cost_per_unit' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function getTable(): string
    {
        return 'ingredients';
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
