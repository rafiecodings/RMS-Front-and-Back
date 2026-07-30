<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('invoice_number')->unique();
            $table->uuid('order_id');
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('service_charge', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->decimal('balance', 12, 2)->default(0);
            $table->string('status')->default('unpaid');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('invoice_id');
            $table->decimal('amount', 12, 2);
            $table->string('payment_method');
            $table->string('reference_number')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('processed_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('invoice_id')->references('id')->on('invoices')->cascadeOnDelete();
            $table->foreign('processed_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('refunds', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('payment_id');
            $table->decimal('amount', 12, 2);
            $table->string('reason');
            $table->string('status')->default('pending');
            $table->uuid('processed_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('payment_id')->references('id')->on('payments')->cascadeOnDelete();
            $table->foreign('processed_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('discounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('code')->nullable()->unique();
            $table->string('type')->default('percentage');
            $table->decimal('value', 10, 2);
            $table->decimal('min_order_amount', 10, 2)->nullable();
            $table->decimal('max_discount_amount', 10, 2)->nullable();
            $table->integer('max_uses')->nullable();
            $table->integer('used_count')->default(0);
            $table->timestamp('start_date')->nullable();
            $table->timestamp('end_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->string('applies_to')->default('all');
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('cash_register_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->decimal('opening_balance', 12, 2)->default(0);
            $table->decimal('closing_balance', 12, 2)->nullable();
            $table->decimal('actual_balance', 12, 2)->nullable();
            $table->decimal('difference', 12, 2)->nullable();
            $table->string('status')->default('open');
            $table->text('notes')->nullable();
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('user_id')->references('id')->on('users')->restrictOnDelete();
        });

        Schema::create('gift_cards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->unique();
            $table->decimal('balance', 12, 2);
            $table->decimal('initial_amount', 12, 2);
            $table->string('status')->default('active');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gift_cards');
        Schema::dropIfExists('cash_register_sessions');
        Schema::dropIfExists('discounts');
        Schema::dropIfExists('refunds');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoices');
    }
};
