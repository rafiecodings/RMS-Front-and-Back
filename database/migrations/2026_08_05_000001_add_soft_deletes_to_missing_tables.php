<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('wastage', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('staff_performance', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('staff_commissions', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('wastage', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('staff_performance', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('staff_commissions', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
