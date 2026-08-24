<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('order_number')->unique();
            $table->uuid('customer_id')->nullable();
            $table->uuid('table_id')->nullable();
            $table->string('order_type')->default('dine_in');
            $table->string('status')->default('pending');
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('service_charge', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->string('payment_status')->default('unpaid');
            $table->string('payment_method')->nullable();
            $table->text('notes')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('customer_id')->references('id')->on('customers')->nullOnDelete();
            $table->foreign('table_id')->references('id')->on('tables')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->uuid('menu_item_id');
            $table->string('name');
            $table->integer('quantity');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('total_price', 10, 2);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->text('notes')->nullable();
            $table->string('status')->default('pending');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->foreign('menu_item_id')->references('id')->on('menu_items')->restrictOnDelete();
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->index(['menu_item_id', 'created_at'], 'idx_order_items_menu_item_created_at');
        });

        Schema::create('order_item_modifiers', function (Blueprint $table) {
            $table->uuid('order_item_id');
            $table->uuid('modifier_id');
            $table->string('name');
            $table->decimal('price', 10, 2);
            $table->primary(['order_item_id', 'modifier_id']);
            $table->foreign('order_item_id')->references('id')->on('order_items')->cascadeOnDelete();
            $table->foreign('modifier_id')->references('id')->on('menu_modifiers')->cascadeOnDelete();
        });

        Schema::create('order_status_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->string('status');
            $table->text('notes')->nullable();
            $table->uuid('changed_by')->nullable();
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->foreign('changed_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_status_history');
        Schema::dropIfExists('order_item_modifiers');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
