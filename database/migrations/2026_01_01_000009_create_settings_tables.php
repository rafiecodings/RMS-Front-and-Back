<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('restaurant_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->text('description')->nullable();
            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('postal_code')->nullable();
            $table->string('country')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();
            $table->string('logo_url')->nullable();
            $table->string('timezone')->default('Asia/Manila');
            $table->string('currency')->default('PHP');
            $table->string('currency_symbol')->default('₱');
            $table->string('tax_id')->nullable();
            $table->string('business_registration')->nullable();
            $table->json('opening_hours')->nullable();
            $table->decimal('default_tax_rate', 5, 2)->default(12);
            $table->decimal('default_service_charge', 5, 2)->default(0);
            $table->boolean('service_charge_enabled')->default(false);
            $table->string('receipt_header')->nullable();
            $table->string('receipt_footer')->nullable();
            $table->string('order_prefix')->default('ORD-');
            $table->string('invoice_prefix')->default('INV-');
            $table->integer('table_reservation_timeout')->default(15);
            $table->integer('kitchen_display_timeout')->default(30);
            $table->integer('auto_cancel_timeout')->default(30);
            $table->boolean('allow_negative_inventory')->default(false);
            $table->integer('low_stock_threshold')->default(10);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('tax_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->decimal('rate', 5, 2);
            $table->string('type')->default('percentage');
            $table->boolean('is_compound')->default(false);
            $table->boolean('is_active')->default(true);
            $table->string('applies_to')->default('all');
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('outlets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->text('address')->nullable();
            $table->string('phone')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('outlets');
        Schema::dropIfExists('tax_settings');
        Schema::dropIfExists('restaurant_settings');
    }
};
