<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('restaurant_settings', function (Blueprint $table) {
            $table->boolean('vat_enabled')->default(true)->after('default_tax_rate');
            $table->boolean('vat_inclusive')->default(false)->after('vat_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('restaurant_settings', function (Blueprint $table) {
            $table->dropColumn(['vat_enabled', 'vat_inclusive']);
        });
    }
};
