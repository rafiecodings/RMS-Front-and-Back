<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends BaseModel
{
    protected $fillable = [
        'order_number',
        'customer_id',
        'table_id',
        'order_type',
        'status',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'discount_id',
        'applied_discount_name',
        'applied_discount_code',
        'applied_discount_type',
        'applied_discount_value',
        'service_charge',
        'total',
        'payment_status',
        'payment_method',
        'archived_at',
        'notes',
        'cancellation_reason',
        'created_by',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'applied_discount_value' => 'decimal:2',
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
}
