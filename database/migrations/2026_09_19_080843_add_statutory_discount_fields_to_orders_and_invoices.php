<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('statutory_discount_type')->nullable()->after('notes');
            $table->string('statutory_discount_reference')->nullable()->after('statutory_discount_type');
            $table->string('statutory_discount_name')->nullable()->after('statutory_discount_reference');
            $table->decimal('qualified_amount', 12, 2)->default(0)->after('statutory_discount_name');
            $table->decimal('statutory_discount_amount', 12, 2)->default(0)->after('qualified_amount');
            $table->decimal('vat_exempt_sales', 12, 2)->default(0)->after('statutory_discount_amount');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->string('statutory_discount_type')->nullable()->after('status');
            $table->string('statutory_discount_reference')->nullable()->after('statutory_discount_type');
            $table->string('statutory_discount_name')->nullable()->after('statutory_discount_reference');
            $table->decimal('qualified_amount', 12, 2)->default(0)->after('statutory_discount_name');
            $table->decimal('statutory_discount_amount', 12, 2)->default(0)->after('qualified_amount');
            $table->decimal('vat_exempt_sales', 12, 2)->default(0)->after('statutory_discount_amount');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'statutory_discount_type',
                'statutory_discount_reference',
                'statutory_discount_name',
                'qualified_amount',
                'statutory_discount_amount',
                'vat_exempt_sales',
            ]);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn([
                'statutory_discount_type',
                'statutory_discount_reference',
                'statutory_discount_name',
                'qualified_amount',
                'statutory_discount_amount',
                'vat_exempt_sales',
            ]);
        });
    }
};