<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('employee_id')->unique();
            $table->string('position')->nullable();
            $table->string('department')->nullable();
            $table->decimal('hourly_rate', 10, 2)->nullable();
            $table->decimal('base_salary', 12, 2)->nullable();
            $table->date('hire_date');
            $table->date('end_date')->nullable();
            $table->string('employment_type')->default('full_time');
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('staff_shifts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->time('start_time');
            $table->time('end_time');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('shift_schedules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('staff_id');
            $table->uuid('shift_id');
            $table->date('date');
            $table->string('status')->default('scheduled');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('staff_id')->references('id')->on('staff_profiles')->cascadeOnDelete();
            $table->foreign('shift_id')->references('id')->on('staff_shifts')->restrictOnDelete();
        });

        Schema::create('attendance', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('staff_id');
            $table->timestamp('clock_in');
            $table->timestamp('clock_out')->nullable();
            $table->decimal('hours_worked', 6, 2)->nullable();
            $table->string('status')->default('present');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('staff_id')->references('id')->on('staff_profiles')->cascadeOnDelete();
        });

        Schema::create('staff_performance', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('staff_id');
            $table->date('period_date');
            $table->integer('orders_served')->default(0);
            $table->decimal('total_sales', 12, 2)->default(0);
            $table->decimal('tips_earned', 12, 2)->default(0);
            $table->decimal('rating', 3, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('staff_id')->references('id')->on('staff_profiles')->cascadeOnDelete();
        });

        Schema::create('staff_commissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('staff_id');
            $table->uuid('order_id');
            $table->decimal('amount', 10, 2);
            $table->string('type')->default('sales');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('staff_id')->references('id')->on('staff_profiles')->cascadeOnDelete();
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_commissions');
        Schema::dropIfExists('staff_performance');
        Schema::dropIfExists('attendance');
        Schema::dropIfExists('shift_schedules');
        Schema::dropIfExists('staff_shifts');
        Schema::dropIfExists('staff_profiles');
    }
};
