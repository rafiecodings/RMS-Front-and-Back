<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrder extends BaseModel
{
    protected $fillable = [
        'po_number',
        'supplier_id',
        'total_amount',
        'status',
        'notes',
        'expected_date',
        'received_at',
        'created_by',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'expected_date' => 'datetime',
        'received_at' => 'datetime',
    ];

    public function getTable(): string
    {
        return 'purchase_orders';
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
