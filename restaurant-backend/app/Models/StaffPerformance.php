<?php

declare(strict_types=1);

namespace App\Models;

class StaffPerformance extends BaseModel
{
    protected $fillable = [
        'staff_id',
        'period_date',
        'orders_served',
        'total_sales',
        'tips_earned',
        'rating',
        'notes',
    ];

    protected $casts = [
        'period_date' => 'date',
        'orders_served' => 'integer',
        'total_sales' => 'decimal:2',
        'tips_earned' => 'decimal:2',
        'rating' => 'decimal:2',
    ];

    public function getTable(): string
    {
        return 'staff_performance';
    }

    public function staff()
    {
        return $this->belongsTo(StaffProfile::class, 'staff_id');
    }
}
