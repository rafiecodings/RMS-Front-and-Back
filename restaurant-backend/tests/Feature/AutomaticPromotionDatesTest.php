<?php

namespace Tests\Feature;

use App\Models\Discount;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Role;
use App\Models\User;
use App\Services\PricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AutomaticPromotionDatesTest extends TestCase
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

    private function makePromo(array $overrides = []): Discount
    {
        return Discount::create(array_merge([
            'name' => 'Auto Promo',
            'code' => 'AUTO_' . uniqid(),
            'type' => 'percentage',
            'value' => 10,
            'min_order_amount' => 100,
            'is_active' => true,
            'promotion_kind' => 'automatic',
            'applies_to' => 'all',
            'eligibility_type' => 'all',
            'start_date' => now()->subDay(),
            'end_date' => now()->addDay(),
        ], $overrides));
    }

    private function resolve(float $subtotal = 193.0): array
    {
        return app(PricingService::class)->resolveBestPromotion($subtotal);
    }

    public function test_promotion_ending_today_is_active_through_end_of_day(): void
    {
        $this->makePromo(['end_date' => now()->startOfDay()]);

        $result = $this->resolve();

        $this->assertNotNull($result['discount']);
        $this->assertEquals(19.30, $result['amount']);
    }

    public function test_promotion_starting_today_is_active(): void
    {
        $this->makePromo(['start_date' => now()->startOfDay()]);

        $result = $this->resolve();

        $this->assertNotNull($result['discount']);
    }

    public function test_promotion_ended_yesterday_is_inactive(): void
    {
        $this->makePromo(['end_date' => now()->subDay()->startOfDay()]);

        $result = $this->resolve();

        $this->assertNull($result['discount']);
    }

    public function test_promotion_starting_tomorrow_is_inactive(): void
    {
        $this->makePromo(['start_date' => now()->addDay()->startOfDay()]);

        $result = $this->resolve();

        $this->assertNull($result['discount']);
    }

    public function test_minimum_spend_not_satisfied_applies_nothing(): void
    {
        $this->makePromo(['min_order_amount' => 500]);

        $result = $this->resolve(193.0);

        $this->assertNull($result['discount']);
    }

    public function test_inactive_promotion_is_ignored(): void
    {
        $this->makePromo(['is_active' => false]);

        $result = $this->resolve();

        $this->assertNull($result['discount']);
    }

    public function test_only_one_automatic_promotion_applies(): void
    {
        $this->makePromo(['value' => 10, 'code' => 'AUTO_A_' . uniqid()]);
        $this->makePromo(['value' => 5, 'code' => 'AUTO_B_' . uniqid()]);

        $result = $this->resolve(200.0);

        $this->assertEquals(20.0, $result['amount']);
    }

    public function test_waiter_order_snapshot_keeps_automatic_promo(): void
    {
        $promo = $this->makePromo();

        $category = MenuCategory::create(['name' => 'Cat ' . uniqid(), 'slug' => 'cat-' . uniqid()]);
        $item = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Item ' . uniqid(),
            'slug' => 'item-' . uniqid(),
            'price' => 193,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/orders', [
                'order_type' => 'takeaway',
                'auto_apply_promotions' => true,
                'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
            ]);

        $response->assertStatus(201);
        $this->assertEquals($promo->id, $response->json('data.applied_discount.id'));
        $this->assertEquals(19.30, (float) $response->json('data.discount_amount'));
    }
}
