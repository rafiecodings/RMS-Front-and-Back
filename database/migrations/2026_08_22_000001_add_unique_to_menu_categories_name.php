<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Defensive: remove any duplicate names before adding a unique index so the
        // index creation cannot fail on pre-existing data. Keeps the oldest row.
        $duplicates = \Illuminate\Support\Facades\DB::table('menu_categories')
            ->select('name', \Illuminate\Support\Facades\DB::raw('MIN(id) as keep_id'))
            ->groupBy('name')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($duplicates as $dup) {
            \Illuminate\Support\Facades\DB::table('menu_categories')
                ->where('name', $dup->name)
                ->where('id', '!=', $dup->keep_id)
                ->delete();
        }

        Schema::table('menu_categories', function (Blueprint $table) {
            $table->unique('name');
        });
    }

    public function down(): void
    {
        Schema::table('menu_categories', function (Blueprint $table) {
            $table->dropUnique(['name']);
        });
    }
};
