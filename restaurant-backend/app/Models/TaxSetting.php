<?php

declare(strict_types=1);

namespace App\Models;

class TaxSetting extends BaseModel
{
    protected $fillable = [
        'name',
        'rate',
        'type',
        'is_compound',
        'is_active',
        'applies_to',
        'description',
    ];

    protected $casts = [
        'rate' => 'decimal:2',
        'is_compound' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function getTable(): string
    {
        return 'tax_settings';
    }
}
