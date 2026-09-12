<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Order;
use App\Models\Reservation;
use App\Models\Table;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

/**
 * Canonical Reservation → Table → Order lifecycle rules.
 *
 *  - pending / confirmed reservations block their time slot but do NOT
 *    physically occupy the table.
 *  - seated reservations occupy the table (tables.status = occupied) and
 *    keep blocking the slot.
 *  - completed / cancelled / no_show reservations never block.
 *  - A dine-in order may be created on an available table, or on an
 *    occupied table that holds an active seated reservation with no other
 *    active dine-in order (one cover → one active order).
 *  - Terminal dine-in settlement (payment) leaves needs_cleaning; manual
 *    Needs Cleaning → Available is the final reset.
 */
class TableDiningPolicy
{
    /** Order statuses that still occupy a table cover. */
    public const ACTIVE_ORDER_STATUSES = [
        'pending', 'confirmed', 'preparing', 'ready', 'served', 'on_hold',
    ];

    /** Terminal order statuses that free a table cover. */
    public const TERMINAL_ORDER_STATUSES = ['completed', 'cancelled', 'voided'];

    /** Reservation statuses that block a table's time slot. */
    public const BLOCKING_RESERVATION_STATUSES = ['pending', 'confirmed', 'seated'];

    public static function activeSeatedReservation(string $tableId): ?Reservation
    {
        return Reservation::where('table_id', $tableId)
            ->where('status', 'seated')
            ->orderByDesc('reservation_date')
            ->orderByDesc('reservation_time')
            ->first();
    }

    public static function hasActiveSeatedReservation(string $tableId): bool
    {
        return Reservation::where('table_id', $tableId)
            ->where('status', 'seated')
            ->exists();
    }

    public static function hasActiveOrder(string $tableId, ?string $exceptOrderId = null): bool
    {
        $query = Order::where('table_id', $tableId)
            ->whereIn('status', self::ACTIVE_ORDER_STATUSES);

        if ($exceptOrderId !== null) {
            $query->where('id', '!=', $exceptOrderId);
        }

        return $query->exists();
    }

    /**
     * Authoritative dine-in creation guard. Aborts 409/422 unless the table
     * is available, or occupied by an active seated reservation with no
     * other active dine-in order.
     */
    public static function assertDineInCreatable(Table $table): void
    {
        if (!$table->is_active) {
            throw new UnprocessableEntityHttpException('Selected table is not active.');
        }

        if ($table->status === 'available') {
            return;
        }

        if ($table->status === 'occupied'
            && self::hasActiveSeatedReservation($table->id)
            && !self::hasActiveOrder($table->id)
        ) {
            return;
        }

        if ($table->status === 'occupied' && self::hasActiveOrder($table->id)) {
            throw new ConflictHttpException('This table already has an active order.');
        }

        throw new ConflictHttpException('Selected table is not available.');
    }

    /**
     * Whether a table may host a brand-new dine-in order right now
     * (used by the order-eligible listing; same rule as the guard).
     */
    public static function isDineInCreatable(Table $table): bool
    {
        try {
            self::assertDineInCreatable($table);
        } catch (\Throwable) {
            return false;
        }

        return true;
    }

    /**
     * Reconcile a dine-in table after its order ended without settlement
     * (void / cancel): an active seated reservation keeps it occupied,
     * otherwise it returns to available. Only transitions out of
     * occupied/available — never touches maintenance or archived tables.
     * Returns the new status, or null when nothing changed.
     */
    public static function releaseAfterOrderEnd(Table $table): ?string
    {
        if (!$table->is_active || !in_array($table->status, ['occupied', 'available'], true)) {
            return null;
        }

        $target = self::hasActiveSeatedReservation($table->id) ? 'occupied' : 'available';

        if ($target === $table->status) {
            return null;
        }

        $from = $table->status;
        $table->update(['status' => $target]);
        AuditLogger::record('table_status_changed', $table, [
            'description' => "Table {$table->number} status changed from "
                .AuditLogger::label($from).' to '.AuditLogger::label($target),
            'from' => $from,
            'to' => $target,
        ], null, ['status' => $from]);

        return $target;
    }

    /**
     * Settle a dine-in table after payment/completion: the cover leaves, so
     * the table needs cleaning. Only transitions out of occupied/available.
     */
    public static function settleAfterPayment(Table $table): ?string
    {
        if (!$table->is_active || !in_array($table->status, ['occupied', 'available'], true)) {
            return null;
        }

        if ($table->status === 'needs_cleaning') {
            return null;
        }

        $from = $table->status;
        $table->update(['status' => 'needs_cleaning']);
        AuditLogger::record('table_status_changed', $table, [
            'description' => "Table {$table->number} status changed from "
                .AuditLogger::label($from).' to Needs Cleaning',
            'from' => $from,
            'to' => 'needs_cleaning',
        ], null, ['status' => $from]);

        return 'needs_cleaning';
    }
}
