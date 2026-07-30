<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Wastage extends BaseModel
{
    protected $fillable = [
        'ingredient_id',
        'quantity',
        'reason',
        'notes',
        'reported_by',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
    ];

    public function getTable(): string
    {
        return 'wastage';
    }

    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }
}
