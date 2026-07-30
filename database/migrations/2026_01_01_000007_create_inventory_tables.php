<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('contact_person')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->string('payment_terms')->nullable();
            $table->decimal('rating', 3, 2)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('ingredients', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('sku')->nullable()->unique();
            $table->string('category')->nullable();
            $table->string('unit');
            $table->decimal('current_stock', 12, 3)->default(0);
            $table->decimal('minimum_stock', 12, 3)->default(0);
            $table->decimal('maximum_stock', 12, 3)->nullable();
            $table->decimal('cost_per_unit', 10, 2)->default(0);
            $table->uuid('supplier_id')->nullable();
            $table->string('storage_location')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('supplier_id')->references('id')->on('suppliers')->nullOnDelete();
        });

        Schema::create('recipes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('menu_item_id');
            $table->text('instructions')->nullable();
            $table->decimal('yield_quantity', 10, 2)->default(1);
            $table->string('yield_unit')->default('serving');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('menu_item_id')->references('id')->on('menu_items')->cascadeOnDelete();
        });

        Schema::create('recipe_ingredients', function (Blueprint $table) {
            $table->uuid('recipe_id');
            $table->uuid('ingredient_id');
            $table->decimal('quantity', 10, 3);
            $table->string('unit');
            $table->decimal('cost', 10, 2)->nullable();
            $table->text('notes')->nullable();
            $table->primary(['recipe_id', 'ingredient_id']);
            $table->foreign('recipe_id')->references('id')->on('recipes')->cascadeOnDelete();
            $table->foreign('ingredient_id')->references('id')->on('ingredients')->restrictOnDelete();
        });

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('ingredient_id');
            $table->string('type');
            $table->decimal('quantity', 12, 3);
            $table->decimal('unit_cost', 10, 2)->nullable();
            $table->string('reference_type')->nullable();
            $table->uuid('reference_id')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('ingredient_id')->references('id')->on('ingredients')->restrictOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('po_number')->unique();
            $table->uuid('supplier_id');
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->string('status')->default('draft');
            $table->text('notes')->nullable();
            $table->timestamp('expected_date')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('supplier_id')->references('id')->on('suppliers')->restrictOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('purchase_order_id');
            $table->uuid('ingredient_id');
            $table->decimal('quantity', 10, 3);
            $table->string('unit');
            $table->decimal('unit_cost', 10, 2);
            $table->decimal('total_cost', 10, 2);
            $table->decimal('received_quantity', 10, 3)->default(0);
            $table->timestamps();

            $table->foreign('purchase_order_id')->references('id')->on('purchase_orders')->cascadeOnDelete();
            $table->foreign('ingredient_id')->references('id')->on('ingredients')->restrictOnDelete();
        });

        Schema::create('wastage', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('ingredient_id');
            $table->decimal('quantity', 10, 3);
            $table->string('reason');
            $table->text('notes')->nullable();
            $table->uuid('reported_by')->nullable();
            $table->timestamps();

            $table->foreign('ingredient_id')->references('id')->on('ingredients')->restrictOnDelete();
            $table->foreign('reported_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wastage');
        Schema::dropIfExists('purchase_order_items');
        Schema::dropIfExists('purchase_orders');
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('recipe_ingredients');
        Schema::dropIfExists('recipes');
        Schema::dropIfExists('ingredients');
        Schema::dropIfExists('suppliers');
    }
};
