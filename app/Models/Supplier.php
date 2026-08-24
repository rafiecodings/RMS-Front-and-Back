<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends BaseModel
{
    protected $fillable = [
        'name',
        'contact_person',
        'email',
        'phone',
        'address',
        'payment_terms',
        'rating',
        'is_active',
    ];

    protected $casts = [
        'rating' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function getTable(): string
    {
        return 'suppliers';
    }

    public function ingredients(): HasMany
    {
        return $this->hasMany(Ingredient::class);
    }
}
