<?php

declare(strict_types=1);

namespace App\Models;

class ReplenishmentRequest extends BaseModel
{
    /** Allowed forward/backward status transitions. */
    public const STATUSES = [
        'draft', 'submitted', 'approved', 'processing',
        'fulfilled', 'rejected', 'cancelled',
    ];

    protected $fillable = [
        'request_number',
        'ingredient_id',
        'quantity',
        'unit',
        'priority',
        'status',
        'requested_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
        ];
    }

    public function getTable(): string
    {
        return 'replenishment_requests';
    }

    public function ingredient()
    {
        return $this->belongsTo(Ingredient::class);
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }
}
