<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Replenishment Requests — the RMS asks the restaurant's inventory owner to
 * restock ingredients. This is intentionally NOT procurement: no suppliers,
 * no vendor negotiation, no purchase-order processing. Those belong to an
 * external purchasing subsystem that can consume approved requests.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('replenishment_requests')) {
            return;
        }

        Schema::create('replenishment_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('request_number')->unique();
            $table->uuid('ingredient_id');
            $table->decimal('quantity', 12, 3);
            $table->string('unit', 20)->nullable();
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            $table->enum('status', [
                'draft', 'submitted', 'approved', 'processing',
                'fulfilled', 'rejected', 'cancelled',
            ])->default('draft');
            $table->uuid('requested_by');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('ingredient_id')->references('id')->on('ingredients');
            $table->foreign('requested_by')->references('id')->on('users');
            $table->index(['status', 'priority']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('replenishment_requests');
    }
};
