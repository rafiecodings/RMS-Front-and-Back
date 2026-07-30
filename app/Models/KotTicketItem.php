<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KotTicketItem extends BaseModel
{
    protected $fillable = [
        'kot_ticket_id',
        'order_item_id',
        'name',
        'quantity',
        'notes',
        'status',
    ];

    protected $casts = [
        'quantity' => 'integer',
    ];

    public function getTable(): string
    {
        return 'kot_ticket_items';
    }

    public function kotTicket(): BelongsTo
    {
        return $this->belongsTo(KotTicket::class);
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }
}
