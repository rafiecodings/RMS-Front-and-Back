<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the customer profile columns that app/Models/Customer.php and
 * CustomerController reference (address, birthday, dietary_restrictions)
 * but that no earlier migration created.
 *
 * Safety notes:
 * - Additive only; every column is nullable, so no backfill is required
 *   and existing rows are untouched.
 * - Idempotent via Schema::hasColumn guards.
 * - No ->after() chaining: unsupported on SQLite/PostgreSQL.
 * - Compatible with SQLite (dev/tests) and PostgreSQL (production).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('customers')) {
            return;
        }

        Schema::table('customers', function (Blueprint $table) {
            if (! Schema::hasColumn('customers', 'address')) {
                $table->string('address')->nullable();
            }
            if (! Schema::hasColumn('customers', 'birthday')) {
                $table->date('birthday')->nullable();
            }
            if (! Schema::hasColumn('customers', 'dietary_restrictions')) {
                $table->text('dietary_restrictions')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('customers')) {
            return;
        }

        Schema::table('customers', function (Blueprint $table) {
            foreach (['address', 'birthday', 'dietary_restrictions'] as $column) {
                if (Schema::hasColumn('customers', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
