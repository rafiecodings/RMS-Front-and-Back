<?php

declare(strict_types=1);

namespace App\Models;

class StaffCommission extends BaseModel
{
    protected $fillable = [
        'staff_id',
        'order_id',
        'amount',
        'type',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function getTable(): string
    {
        return 'staff_commissions';
    }

    public function staff()
    {
        return $this->belongsTo(StaffProfile::class, 'staff_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
