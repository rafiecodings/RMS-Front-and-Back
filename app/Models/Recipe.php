<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Recipe extends BaseModel
{
    protected $fillable = [
        'menu_item_id',
        'instructions',
        'yield_quantity',
        'yield_unit',
    ];

    protected $casts = [
        'yield_quantity' => 'decimal:2',
    ];

    public function getTable(): string
    {
        return 'recipes';
    }

    public function menuItem(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class);
    }

    public function ingredients(): BelongsToMany
    {
        return $this->belongsToMany(Ingredient::class, 'recipe_ingredients');
    }
}
