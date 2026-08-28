<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the archive flag used by the Orders / Reservations / Kitchen (KOT)
 * modules: a nullable archived_at timestamp.
 *
 * Contract notes:
 * - Customers intentionally do NOT get archived_at: the frontend treats
 *   is_active = false as "archived" for customers (see customers page),
 *   so no second archive concept is introduced there.
 * - Archived records are soft-hidden from default lists; they are never
 *   deleted. archived_at is separate from deleted_at.
 * - Idempotent and safe on SQLite (dev/tests) and PostgreSQL (production).
 */
return new class extends Migration
{
    private const TABLES = ['orders', 'reservations', 'kot_tickets'];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            if (! Schema::hasTable($table) || Schema::hasColumn($table, 'archived_at')) {
                continue;
            }

            Schema::table($table, function (Blueprint $t) {
                $t->timestamp('archived_at')->nullable()->index();
            });
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'archived_at')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->dropIndex(['archived_at']);
                    $t->dropColumn('archived_at');
                });
            }
        }
    }
};
