<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kot_tickets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('kot_number')->unique();
            $table->uuid('order_id');
            $table->string('status')->default('received');
            $table->string('priority')->default('normal');
            $table->string('station')->nullable();
            $table->integer('estimated_minutes')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
        });

        Schema::create('kot_ticket_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('kot_ticket_id');
            $table->uuid('order_item_id');
            $table->string('name');
            $table->integer('quantity');
            $table->text('notes')->nullable();
            $table->string('status')->default('pending');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('kot_ticket_id')->references('id')->on('kot_tickets')->cascadeOnDelete();
            $table->foreign('order_item_id')->references('id')->on('order_items')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kot_ticket_items');
        Schema::dropIfExists('kot_tickets');
    }
};
