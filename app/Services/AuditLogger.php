<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * Central audit trail writer for important business events.
 *
 * Canonical event shape (audit_logs):
 *  - user_id:        the AUTHENTICATED user who performed the action
 *                    (never created_by/updated_by/request-target substitutes,
 *                    unless the action is explicitly system-generated).
 *  - action:         stable machine key, e.g. "order_confirmed". The Audit
 *                    Logs UI renders a human label from it.
 *  - auditable_type: the domain model class (module-aware filtering).
 *  - auditable_id:   the record UUID (record-aware).
 *  - old_values:     previous values for the meaningful change (if any).
 *  - new_values:     array payload; MUST carry a human-readable
 *                    "description" using business identifiers (table number,
 *                    RES-/ORD-/RPL- numbers, names) — never UUID-only text,
 *                    never passwords/tokens/secrets.
 *
 * Conventions:
 *  - One meaningful business event per transition (no duplicate rows for the
 *    same semantic event; e.g. a replenishment fulfillment logs ONE
 *    replenishment_fulfilled row, not an extra stock row for the same event).
 *  - Auditing must never break the business transaction (swallow-all).
 */
class AuditLogger
{
    public static function record(
        string $action,
        ?Model $auditable = null,
        array $context = [],
        ?int $userId = null,
        array $oldValues = [],
    ): void {
        try {
            $user = $userId !== null ? $userId : Auth::id();

            AuditLog::create([
                'user_id' => $user,
                'auditable_type' => $auditable?->getMorphClass(),
                'auditable_id' => $auditable?->getKey(),
                'action' => $action,
                'old_values' => $oldValues === [] ? null : $oldValues,
                'new_values' => $context === [] ? null : $context,
                'ip_address' => request()?->ip(),
                'user_agent' => substr((string) request()?->userAgent(), 0, 500) ?: null,
            ]);
        } catch (\Throwable) {
            // Auditing must never break the business transaction.
        }
    }

    /**
     * Human label for a machine status value: "needs_cleaning" → "Needs Cleaning".
     */
    public static function label(?string $value): string
    {
        return ucwords(str_replace(['_', '-'], ' ', (string) $value));
    }
}
