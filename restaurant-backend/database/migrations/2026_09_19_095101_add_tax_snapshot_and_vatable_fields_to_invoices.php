<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            // VATable/Exempt sales (vat_exempt_sales is created with default(0)
            // by 2026_09_19_080843, which always runs first; no ->change()
            // here because doctrine/dbal is not installed)
            $table->decimal('vatable_sales', 12, 2)->default(0)->after('vat_exempt_sales');

            // Tax snapshots
            $table->boolean('vat_enabled_snapshot')->default(true)->after('vat_exempt_sales');
            $table->boolean('vat_inclusive_snapshot')->default(true)->after('vat_enabled_snapshot');
            $table->decimal('tax_rate_snapshot', 5, 2)->default(12.00)->after('vat_inclusive_snapshot');
            $table->string('seller_tin_snapshot')->nullable()->after('tax_rate_snapshot');
            $table->string('seller_branch_code_snapshot', 10)->nullable()->after('seller_tin_snapshot');
            $table->string('seller_registered_name_snapshot')->nullable()->after('seller_branch_code_snapshot');
            $table->string('seller_address_snapshot')->nullable()->after('seller_registered_name_snapshot');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            // NOTE: vat_exempt_sales is owned by 2026_09_19_080843 and is
            // intentionally not dropped here.
            $table->dropColumn([
                'vatable_sales',
                'vat_enabled_snapshot',
                'vat_inclusive_snapshot',
                'tax_rate_snapshot',
                'seller_tin_snapshot',
                'seller_branch_code_snapshot',
                'seller_registered_name_snapshot',
                'seller_address_snapshot',
            ]);
        });
    }
};