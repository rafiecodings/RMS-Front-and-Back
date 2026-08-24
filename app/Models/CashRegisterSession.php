<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashRegisterSession extends BaseModel
{
    protected $fillable = [
        'user_id',
        'opening_balance',
        'closing_balance',
        'actual_balance',
        'difference',
        'status',
        'notes',
        'opened_at',
        'closed_at',
    ];

    protected $casts = [
        'opening_balance' => 'decimal:2',
        'closing_balance' => 'decimal:2',
        'actual_balance' => 'decimal:2',
        'difference' => 'decimal:2',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function getTable(): string
    {
        return 'cash_register_sessions';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
