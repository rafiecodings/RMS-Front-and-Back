<?php

declare(strict_types=1);

namespace App\Models;

class MenuModifier extends BaseModel
{
    protected $fillable = [
        'name',
        'price',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function getTable(): string
    {
        return 'menu_modifiers';
    }
}
