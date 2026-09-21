<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Align the schema default and existing settings rows with the RMS
     * VAT-inclusive menu pricing policy.
     *
     * - Future rows default to vat_inclusive = true.
     * - Existing settings rows are flipped to inclusive. Transactional
     *   records are NOT touched; invoices carry their own tax snapshots.
     */
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE `restaurant_settings` MODIFY `vat_inclusive` TINYINT(1) NOT NULL DEFAULT 1');
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE "restaurant_settings" ALTER COLUMN "vat_inclusive" SET DEFAULT true');
        }
        // SQLite has no ALTER COLUMN support; fresh rows there are covered
        // by explicit seeder values (DatabaseSeeder::createRestaurantSettings).

        DB::table('restaurant_settings')
            ->where('vat_inclusive', false)
            ->update(['vat_inclusive' => true]);
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE `restaurant_settings` MODIFY `vat_inclusive` TINYINT(1) NOT NULL DEFAULT 0');
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE "restaurant_settings" ALTER COLUMN "vat_inclusive" SET DEFAULT false');
        }
        // Intentionally does not flip existing rows back.
    }
};
