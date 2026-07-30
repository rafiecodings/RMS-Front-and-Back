<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KotTicket extends BaseModel
{
    protected $fillable = [
        'kot_number',
        'order_id',
        'status',
        'priority',
        'station',
        'estimated_minutes',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'estimated_minutes' => 'integer',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function getTable(): string
    {
        return 'kot_tickets';
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(KotTicketItem::class);
    }
}
