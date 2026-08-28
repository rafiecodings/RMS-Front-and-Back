<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * Lightweight audit trail writer for important business events.
 *
 * Storage contract (audit_logs): user_id, auditable_type, auditable_id,
 * action, old_values, new_values, ip_address, user_agent.
 *
 * Conventions used by the frontend Audit Logs screen:
 *  - $action is a stable machine key, e.g. "order_confirmed".
 *  - new_values may carry a human "description" plus small context payloads;
 *    the UI renders that description directly.
 */
class AuditLogger
{
    public static function record(
        string $action,
        ?Model $auditable = null,
        array $context = [],
        ?int $userId = null,
    ): void {
        try {
            $user = $userId !== null ? $userId : Auth::id();

            AuditLog::create([
                'user_id' => $user,
                'auditable_type' => $auditable?->getMorphClass(),
                'auditable_id' => $auditable?->getKey(),
                'action' => $action,
                'old_values' => null,
                'new_values' => $context === [] ? null : json_encode($context),
                'ip_address' => request()?->ip(),
                'user_agent' => substr((string) request()?->userAgent(), 0, 500) ?: null,
            ]);
        } catch (\Throwable) {
            // Auditing must never break the business transaction.
        }
    }
}
