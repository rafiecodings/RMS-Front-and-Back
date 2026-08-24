<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends BaseModel
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_PENDING = 'pending';
    public const STATUS_CONFIRMED = 'confirmed';
    public const STATUS_PREPARING = 'preparing';
    public const STATUS_READY = 'ready';
    public const STATUS_SERVED = 'served';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';

    /**
     * Authoritative order status state machine.
     *
     * draft      → confirmed | cancelled
     * pending    → confirmed | cancelled
     * confirmed  → preparing  | cancelled
     * preparing  → ready      | cancelled
     * ready      → served     | cancelled
     * served     → completed
     * completed  → (terminal)
     * cancelled  → (terminal)
     */
    public const VALID_TRANSITIONS = [
        self::STATUS_DRAFT => [self::STATUS_CONFIRMED, self::STATUS_CANCELLED],
        self::STATUS_PENDING => [self::STATUS_CONFIRMED, self::STATUS_CANCELLED],
        self::STATUS_CONFIRMED => [self::STATUS_PREPARING, self::STATUS_CANCELLED],
        self::STATUS_PREPARING => [self::STATUS_READY, self::STATUS_CANCELLED],
        self::STATUS_READY => [self::STATUS_SERVED, self::STATUS_CANCELLED],
        self::STATUS_SERVED => [self::STATUS_COMPLETED],
        self::STATUS_COMPLETED => [],
        self::STATUS_CANCELLED => [],
    ];

    /**
     * Returns true only for a legal forward transition from the current status.
     */
    public function canTransitionTo(string $newStatus): bool
    {
        if ($this->status === $newStatus) {
            return false;
        }

        return in_array($newStatus, self::VALID_TRANSITIONS[$this->status] ?? [], true);
    }

    protected $fillable = [
        'order_number',
        'customer_id',
        'table_id',
        'order_type',
        'status',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'service_charge',
        'total',
        'payment_status',
        'payment_method',
        'notes',
        'cancellation_reason',
        'created_by',
        'archived_at',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'service_charge' => 'decimal:2',
        'total' => 'decimal:2',
        'archived_at' => 'datetime',
    ];

    public function getTable(): string
    {
        return 'orders';
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(Table::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments(): HasManyThrough
    {
        return $this->hasManyThrough(Payment::class, Invoice::class);
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
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
