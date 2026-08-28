<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('customers')->update(['customer_type' => 'registered']);

        Schema::table('customers', function (Blueprint $table) {
            $table->string('customer_type')->default('registered')->change();
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('customer_type')->default('walk_in')->change();
        });
    }
};
