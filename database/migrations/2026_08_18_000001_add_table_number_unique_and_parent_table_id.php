<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tables', function (Blueprint $table) {
            $table->uuid('parent_table_id')->nullable()->after('is_active');
            $table->foreign('parent_table_id')
                ->references('id')
                ->on('tables')
                ->nullOnDelete();
            $table->unique('number');
        });
    }

    public function down(): void
    {
        Schema::table('tables', function (Blueprint $table) {
            $table->dropForeign(['parent_table_id']);
            $table->dropColumn('parent_table_id');
            $table->dropUnique(['number']);
        });
    }
};