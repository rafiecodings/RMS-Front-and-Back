<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Allow staff profiles without a linked login account so that
        // "Enable System Access" is truly optional in the Add Staff flow.
        Schema::table('staff_profiles', function (Blueprint $table) {
            $table->uuid('user_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('staff_profiles', function (Blueprint $table) {
            $table->uuid('user_id')->nullable(false)->change();
        });
    }
};
