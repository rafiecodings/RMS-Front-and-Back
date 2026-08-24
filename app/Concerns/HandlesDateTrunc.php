<?php

namespace App\Concerns;

use Illuminate\Support\Facades\DB;

/**
 * Cross-database raw SQL helpers.
 *
 * Several dashboard/report queries originally used PostgreSQL-only syntax
 * (date(), extract(epoch from ...), date_trunc()). These helpers detect the
 * active driver and return the equivalent expression for SQLite (local dev),
 * PostgreSQL (production), or fall back to SQLite.
 */
trait HandlesDateTrunc
{
    protected function dbDriver(): string
    {
        return DB::getDriverName();
    }

    /** Wrap a datetime column in a DATE() cast. */
    protected function dateColumn(string $column): string
    {
        return match ($this->dbDriver()) {
            'pgsql' => "date({$column})",
            default => "DATE({$column})",
        };
    }

    /** Average elapsed minutes between two datetime columns. */
    protected function avgMinutesBetween(string $start, string $end): string
    {
        return match ($this->dbDriver()) {
            'pgsql' => "avg(extract(epoch from ({$end} - {$start})) / 60) as avg_minutes",
            default => "avg((julianday({$end}) - julianday({$start})) * 1440) as avg_minutes",
        };
    }

    /** Average elapsed minutes between now() and a datetime column. */
    protected function avgMinutesAgo(string $column): string
    {
        return match ($this->dbDriver()) {
            'pgsql' => "avg(extract(epoch from (now() - {$column})) / 60) as avg_minutes",
            default => "avg((julianday('now') - julianday({$column})) * 1440) as avg_minutes",
        };
    }

    /** Extract the hour (0-23) from a datetime column. */
    protected function hourOf(string $column): string
    {
        return match ($this->dbDriver()) {
            'pgsql' => "extract(hour from {$column}) as hour",
            default => "CAST(strftime('%H', {$column}) AS INTEGER) as hour",
        };
    }

    /**
     * Date truncation for grouped revenue/sales charts.
     *
     * @param  string  $column  The datetime column.
     * @param  string  $unit    'day' | 'week' | 'month'
     * @param  string  $alias   The output alias (default: period or date).
     */
    protected function dateTrunc(string $column, string $unit, string $alias = 'period'): string
    {
        $alias = "as {$alias}";
        return match ($this->dbDriver()) {
            'pgsql' => "date_trunc('{$unit}', {$column})::date {$alias}",
            default => "date({$column}) {$alias}",
        };
    }
}
