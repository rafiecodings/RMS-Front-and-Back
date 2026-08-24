<?php

declare(strict_types=1);

namespace App\Models;

class Customer extends BaseModel
{
    protected $fillable = [
        'name', 'email', 'phone', 'address', 'birthday', 'dietary_restrictions', 'customer_type',
        'loyalty_points', 'total_spent', 'visit_count', 'notes', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'loyalty_points' => 'integer',
            'total_spent' => 'decimal:2',
            'visit_count' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function getTable(): string
    {
        return 'customers';
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }
}
