<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('image_url')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('menu_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('category_id');
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->string('image_url')->nullable();
            $table->string('sku')->nullable()->unique();
            $table->boolean('is_available')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->decimal('cost_price', 10, 2)->nullable();
            $table->integer('prep_time_minutes')->nullable();
            $table->json('tags')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('category_id')->references('id')->on('menu_categories')->cascadeOnDelete();
        });

        Schema::create('menu_modifiers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->decimal('price', 10, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('menu_item_modifiers', function (Blueprint $table) {
            $table->uuid('menu_item_id');
            $table->uuid('modifier_id');
            $table->primary(['menu_item_id', 'modifier_id']);
            $table->foreign('menu_item_id')->references('id')->on('menu_items')->cascadeOnDelete();
            $table->foreign('modifier_id')->references('id')->on('menu_modifiers')->cascadeOnDelete();
        });

        Schema::create('menu_combos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('menu_combo_items', function (Blueprint $table) {
            $table->uuid('combo_id');
            $table->uuid('menu_item_id');
            $table->integer('quantity')->default(1);
            $table->primary(['combo_id', 'menu_item_id']);
            $table->foreign('combo_id')->references('id')->on('menu_combos')->cascadeOnDelete();
            $table->foreign('menu_item_id')->references('id')->on('menu_items')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_combo_items');
        Schema::dropIfExists('menu_combos');
        Schema::dropIfExists('menu_item_modifiers');
        Schema::dropIfExists('menu_modifiers');
        Schema::dropIfExists('menu_items');
        Schema::dropIfExists('menu_categories');
    }
};
