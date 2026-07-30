<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MenuItem extends BaseModel
{
    protected $fillable = [
        'category_id',
        'name',
        'slug',
        'description',
        'price',
        'image_url',
        'sku',
        'is_available',
        'is_featured',
        'cost_price',
        'prep_time_minutes',
        'tags',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'is_available' => 'boolean',
        'is_featured' => 'boolean',
        'prep_time_minutes' => 'integer',
        'tags' => 'array',
    ];

    public function getTable(): string
    {
        return 'menu_items';
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(MenuCategory::class);
    }

    public function modifiers(): BelongsToMany
    {
        return $this->belongsToMany(MenuModifier::class, 'menu_item_modifiers');
    }

    public function recipes(): HasMany
    {
        return $this->hasMany(Recipe::class);
    }
}
