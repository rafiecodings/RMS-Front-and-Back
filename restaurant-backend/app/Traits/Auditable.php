<?php

namespace App\Traits;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(function (Model $model) {
            $model->logAudit('created', $model->getAttributes());
        });

        static::updated(function (Model $model) {
            $dirty = $model->getDirty();
            $model->logAudit('updated', $dirty);
        });

        static::deleted(function (Model $model) {
            $model->logAudit('deleted', $model->getAttributes());
        });
    }

    public function logAudit(string $action, array $data = []): void
    {
        AuditLog::create([
            'user_id' => auth()->id(),
            'auditable_type' => static::class,
            'auditable_id' => $this->getKey(),
            'action' => $action,
            'old_values' => $action === 'updated' ? $data : null,
            'new_values' => $action !== 'updated' ? $data : null,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    public function auditLogs()
    {
        return $this->morphMany(AuditLog::class, 'auditable');
    }
}
