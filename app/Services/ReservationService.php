<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Reservation;
use App\Models\Table;

class ReservationService
{
    /**
     * Default reservation duration in minutes, used for time-window overlap detection.
     * A reservation occupies [start, start + duration).
     */
    public const DEFAULT_DURATION = 120;

    /**
     * Check for time-window overlap on a table for a given date/time.
     *
     * Two reservations conflict if their time windows intersect.
     * Boundary-touching (end == start) is allowed (not a conflict).
     */
    public function hasOverlap(
        string $tableId,
        string $date,
        string $time,
        ?string $excludeReservationId = null
    ): bool {
        $start = \Carbon\Carbon::parse("{$date} {$time}");
        $end = $start->copy()->addMinutes(self::DEFAULT_DURATION);

        $query = Reservation::where('table_id', $tableId)
            ->whereDate('reservation_date', $date)
            ->whereNotIn('status', [Reservation::STATUS_CANCELLED, Reservation::STATUS_COMPLETED])
            ->where('id', '!=', $excludeReservationId ?? '00000000-0000-0000-0000-000000000000');

        $overlapping = $query->get()->filter(function ($r) use ($start, $end, $date) {
            $rStart = \Carbon\Carbon::parse("{$date} {$r->reservation_time}");
            $rEnd = $rStart->copy()->addMinutes(self::DEFAULT_DURATION);

            // Overlap if start < other_end AND end > other_start
            return $start->lt($rEnd) && $end->gt($rStart);
        });

        return $overlapping->isNotEmpty();
    }

    /**
     * Sync the table status based on the reservation status transition.
     *
     * Rules:
     *  - cancelled / no_show -> table becomes available (if reserved/occupied)
     *  - seated (checked-in) -> table becomes occupied (if available/reserved)
     *  - confirmed / pending -> table becomes reserved (if available)
     *  - completed           -> table becomes available (if occupied)
     */
    public function syncTableStatus(string $tableId, string $reservationStatus): void
    {
        if (in_array($reservationStatus, [Reservation::STATUS_CANCELLED, Reservation::STATUS_NO_SHOW])) {
            Table::where('id', $tableId)
                ->whereIn('status', [Table::STATUS_RESERVED, Table::STATUS_OCCUPIED])
                ->update(['status' => Table::STATUS_AVAILABLE]);
        } elseif ($reservationStatus === Reservation::STATUS_SEATED) {
            Table::where('id', $tableId)
                ->whereIn('status', [Table::STATUS_AVAILABLE, Table::STATUS_RESERVED])
                ->update(['status' => Table::STATUS_OCCUPIED]);
        } elseif (in_array($reservationStatus, [Reservation::STATUS_CONFIRMED, Reservation::STATUS_PENDING])) {
            Table::where('id', $tableId)
                ->where('status', Table::STATUS_AVAILABLE)
                ->update(['status' => Table::STATUS_RESERVED]);
        } elseif ($reservationStatus === Reservation::STATUS_COMPLETED) {
            Table::where('id', $tableId)
                ->where('status', Table::STATUS_OCCUPIED)
                ->update(['status' => Table::STATUS_AVAILABLE]);
        }
    }

    /**
     * Validate that a table can be assigned to a reservation at the given slot.
     * Returns null if valid, or an error message string if invalid.
     */
    public function validateTableAssignment(
        ?string $tableId,
        string $date,
        string $time,
        ?string $excludeReservationId = null,
        ?int $partySize = null
    ): ?string {
        if (! $tableId) {
            return null;
        }

        $table = Table::find($tableId);
        if (! $table) {
            return 'Table not found.';
        }

        if (in_array($table->status, [Table::STATUS_OCCUPIED, Table::STATUS_RESERVED])
            && $table->id !== ($excludeReservationId ? $table->id : null)) {
            return 'Table is already occupied or reserved.';
        }

        if ($partySize !== null && $table->capacity < $partySize) {
            return "Table capacity ({$table->capacity}) is too small for party size {$partySize}.";
        }

        if ($this->hasOverlap($tableId, $date, $time, $excludeReservationId)) {
            return 'Table already has a reservation at this time.';
        }

        return null;
    }

    /**
     * Get tables available for a given date/time/party size, considering active reservations.
     */
    public function getAvailableTables(
        string $date,
        string $time,
        int $partySize = 1,
        ?string $excludeReservationId = null
    ) {
        $query = Table::query()
            ->where('is_active', true)
            ->where('status', Table::STATUS_AVAILABLE)
            ->where('capacity', '>=', $partySize)
            ->whereNotExists(function ($q) use ($date, $time, $excludeReservationId) {
                $q->from('reservations')
                    ->where('reservations.table_id', \DB::raw('tables.id'))
                    ->where('reservations.reservation_date', $date)
                    ->where('reservations.reservation_time', '>=', \Carbon\Carbon::parse("{$date} {$time}")->subMinutes(self::DEFAULT_DURATION)->format('H:i'))
                    ->where('reservations.reservation_time', '<=', \Carbon\Carbon::parse("{$date} {$time}")->addMinutes(self::DEFAULT_DURATION)->format('H:i'))
                    ->whereIn('reservations.status', [
                        Reservation::STATUS_PENDING,
                        Reservation::STATUS_CONFIRMED,
                        Reservation::STATUS_SEATED,
                    ]);
                if ($excludeReservationId) {
                    $q->where('reservations.id', '!=', $excludeReservationId);
                }
            });

        return $query->orderBy('number')->get();
    }
}
