<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('discounts', function (Blueprint $table) {
            $table->string('promotion_kind')->default('automatic')->after('description');
            $table->string('eligibility_type')->default('all')->after('promotion_kind');
            $table->string('minimum_loyalty_tier')->nullable()->after('eligibility_type');
            $table->boolean('verification_required')->default(false)->after('minimum_loyalty_tier');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->uuid('discount_id')->nullable()->after('discount_amount');
            $table->string('applied_discount_name')->nullable()->after('discount_id');
            $table->string('applied_discount_code')->nullable()->after('applied_discount_name');
            $table->string('applied_discount_type')->nullable()->after('applied_discount_code');
            $table->decimal('applied_discount_value', 10, 2)->nullable()->after('applied_discount_type');
            $table->foreign('discount_id')->references('id')->on('discounts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['discount_id']);
            $table->dropColumn([
                'discount_id',
                'applied_discount_name',
                'applied_discount_code',
                'applied_discount_type',
                'applied_discount_value',
            ]);
        });

        Schema::table('discounts', function (Blueprint $table) {
            $table->dropColumn([
                'promotion_kind',
                'eligibility_type',
                'minimum_loyalty_tier',
                'verification_required',
            ]);
        });
    }
};
