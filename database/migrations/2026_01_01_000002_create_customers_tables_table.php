<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('customer_type')->default('walk_in');
            $table->integer('loyalty_points')->default(0);
            $table->decimal('total_spent', 12, 2)->default(0);
            $table->integer('visit_count')->default(0);
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('floor_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('tables', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('floor_plan_id');
            $table->string('number');
            $table->integer('capacity');
            $table->string('status')->default('available');
            $table->string('shape')->default('rectangle');
            $table->decimal('pos_x', 8, 2)->nullable();
            $table->decimal('pos_y', 8, 2)->nullable();
            $table->decimal('width', 8, 2)->nullable();
            $table->decimal('height', 8, 2)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('floor_plan_id')->references('id')->on('floor_plans')->cascadeOnDelete();
        });

        Schema::create('reservations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('customer_id')->nullable();
            $table->uuid('table_id')->nullable();
            $table->string('reservation_number')->unique();
            $table->string('guest_name');
            $table->string('guest_phone')->nullable();
            $table->string('guest_email')->nullable();
            $table->integer('party_size');
            $table->datetime('reservation_date');
            $table->time('reservation_time');
            $table->string('status')->default('pending');
            $table->string('source')->default('phone');
            $table->text('special_requests')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('customer_id')->references('id')->on('customers')->nullOnDelete();
            $table->foreign('table_id')->references('id')->on('tables')->nullOnDelete();
        });

        Schema::create('waitlist', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('guest_name');
            $table->string('guest_phone');
            $table->integer('party_size');
            $table->string('status')->default('waiting');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('waitlist');
        Schema::dropIfExists('reservations');
        Schema::dropIfExists('tables');
        Schema::dropIfExists('floor_plans');
        Schema::dropIfExists('customers');
    }
};
