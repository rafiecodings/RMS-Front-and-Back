<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class MenuCategory extends BaseModel
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'image_url',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function getTable(): string
    {
        return 'menu_categories';
    }

    public function items(): HasMany
    {
        return $this->hasMany(MenuItem::class);
    }
}
