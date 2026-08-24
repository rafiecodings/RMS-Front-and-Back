<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KotTicket extends BaseModel
{
    public const STATUS_RECEIVED = 'received';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_READY = 'ready';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_VOIDED = 'voided';

    /**
     * Authoritative KOT status state machine.
     *
     * received    → in_progress | voided
     * in_progress → ready       | voided
     * ready       → completed   | voided
     * completed   → (terminal)
     * voided      → (terminal)
     */
    public const VALID_TRANSITIONS = [
        self::STATUS_RECEIVED => [self::STATUS_IN_PROGRESS, self::STATUS_VOIDED],
        self::STATUS_IN_PROGRESS => [self::STATUS_READY, self::STATUS_VOIDED],
        self::STATUS_READY => [self::STATUS_COMPLETED, self::STATUS_VOIDED],
        self::STATUS_COMPLETED => [],
        self::STATUS_VOIDED => [],
    ];

    public function canTransitionTo(string $newStatus): bool
    {
        if ($this->status === $newStatus) {
            return false;
        }

        return in_array($newStatus, self::VALID_TRANSITIONS[$this->status] ?? [], true);
    }

    protected $fillable = [
        'kot_number',
        'order_id',
        'status',
        'priority',
        'station',
        'estimated_minutes',
        'started_at',
        'completed_at',
        'archived_at',
    ];

    protected $casts = [
        'estimated_minutes' => 'integer',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'archived_at' => 'datetime',
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

    public function scopeNotArchived($query)
    {
        return $query->whereNull('archived_at');
    }

    public function scopeArchived($query)
    {
        return $query->whereNotNull('archived_at');
    }
}
