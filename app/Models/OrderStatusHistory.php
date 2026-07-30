<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderStatusHistory extends BaseModel
{
    protected $fillable = [
        'order_id',
        'status',
        'notes',
        'changed_by',
    ];

    public function getTable(): string
    {
        return 'order_status_history';
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function changer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
