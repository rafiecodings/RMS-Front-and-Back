<?php

declare(strict_types=1);

namespace App\Models;

class AuditLog extends BaseModel
{
    public static function bootSoftDeletes(): void
    {
        // Append-only ledger table: no soft-delete global scope.
    }

    public function initializeSoftDeletes(): void
    {
        // Append-only ledger table: no deleted_at cast.
    }

    protected $fillable = [
        'user_id',
        'auditable_type',
        'auditable_id',
        'action',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    public function getTable(): string
    {
        return 'audit_logs';
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function auditable()
    {
        return $this->morphTo();
    }
}
