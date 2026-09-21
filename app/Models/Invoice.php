<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Invoice extends BaseModel
{
    protected $fillable = [
        'invoice_number',
        'order_id',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'service_charge',
        'total',
        'amount_paid',
        'balance',
        'status',
        'statutory_discount_type',
        'statutory_discount_reference',
        'statutory_discount_name',
        'qualified_amount',
        'statutory_discount_amount',
        'vat_exempt_sales',
        'vatable_sales',
        'vat_enabled_snapshot',
        'vat_inclusive_snapshot',
        'tax_rate_snapshot',
        'seller_tin_snapshot',
        'seller_branch_code_snapshot',
        'seller_registered_name_snapshot',
        'seller_address_snapshot',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'service_charge' => 'decimal:2',
        'total' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'balance' => 'decimal:2',
        'qualified_amount' => 'decimal:2',
        'statutory_discount_amount' => 'decimal:2',
        'vat_exempt_sales' => 'decimal:2',
        'vatable_sales' => 'decimal:2',
        'vat_enabled_snapshot' => 'boolean',
        'vat_inclusive_snapshot' => 'boolean',
        'tax_rate_snapshot' => 'decimal:2',
    ];

    public function getTable(): string
    {
        return 'invoices';
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function refunds(): HasManyThrough
    {
        return $this->hasManyThrough(Refund::class, Payment::class);
    }
}
