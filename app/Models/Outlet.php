<?php

declare(strict_types=1);

namespace App\Models;

class Outlet extends BaseModel
{
    protected $fillable = [
        'name',
        'address',
        'phone',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function getTable(): string
    {
        return 'outlets';
    }
}
