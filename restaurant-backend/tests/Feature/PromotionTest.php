<?php

namespace Tests\Feature;

use App\Models\Discount;
use App\Models\MenuItem;
use App\Models\MenuCategory;
use App\Models\Order;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PromotionTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->user->roles()->attach(
            Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Admin', 'module' => 'system'])
        );
    }

    private function makeDiscount(string $type, float $value, float $min = 0): Discount
    {
        return Discount::create([
            'name' => "Promo {$type} {$value}",
            'code' => 'PROMO_' . uniqid(),
            'type' => $type,
            'value' => $value,
            'min_order_amount' => $min,
            'is_active' => true,
            'applies_to' => 'all',
            'start_date' => now()->subDay(),
            'end_date' => now()->addDay(),
        ]);
    }

    public function test_best_eligible_promotion_is_applied_non_stacking(): void
    {
        // Two overlapping broad promotions: 10% and 5%. Only the BEST applies.
        $this->makeDiscount('percentage', 10);
        $this->makeDiscount('percentage', 5);

        $category = MenuCategory::create(['name' => 'Cat ' . uniqid(), 'slug' => 'cat-' . uniqid()]);
        $item = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Item ' . uniqid(),
            'slug' => 'item-' . uniqid(),
            'price' => 100,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/orders', [
                'order_type' => 'takeaway',
                'auto_apply_promotions' => true,
                'items' => [
                    [
                        'menu_item_id' => $item->id,
                        'quantity' => 1,
                        'unit_price' => 100,
                    ],
                ],
            ]);

        $response->assertStatus(201);
        // Highest eligible (10% of 100 = 10), NOT 15%.
        $this->assertEquals(10.0, (float) $response->json('data.discount_amount'));
    }

    public function test_no_promotion_when_opt_not_sent(): void
    {
        $this->makeDiscount('percentage', 10);

        $category = MenuCategory::create(['name' => 'Cat ' . uniqid(), 'slug' => 'cat-' . uniqid()]);
        $item = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Item ' . uniqid(),
            'slug' => 'item-' . uniqid(),
            'price' => 100,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/orders', [
                'order_type' => 'takeaway',
                'items' => [
                    ['menu_item_id' => $item->id, 'quantity' => 1, 'unit_price' => 100],
                ],
            ]);

        $response->assertStatus(201);
        $this->assertEquals(0.0, (float) $response->json('data.discount_amount'));
    }
}
