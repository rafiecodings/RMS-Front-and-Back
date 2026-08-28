<?php

namespace Tests\Feature;

use App\Models\Discount;
use App\Models\Customer;
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

    public function test_loyalty_promotion_applies_to_eligible_customer_but_not_walk_in(): void
    {
        Discount::create([
            'name' => 'Silver Reward',
            'code' => 'SILVER'.uniqid(),
            'type' => 'percentage',
            'value' => 10,
            'is_active' => true,
            'promotion_kind' => 'automatic',
            'applies_to' => 'all',
            'eligibility_type' => 'loyalty_tier',
            'minimum_loyalty_tier' => 'Silver',
            'start_date' => now()->subDay(),
            'end_date' => now()->addDay(),
        ]);

        $customer = Customer::create([
            'name' => 'Silver UAT Customer',
            'phone' => '09170000001',
            'visit_count' => 10,
            'is_active' => true,
        ]);
        $item = $this->menuItem();

        $eligible = $this->actingAs($this->user)->postJson('/api/v1/orders', [
            'order_type' => 'takeaway',
            'customer_id' => $customer->id,
            'auto_apply_promotions' => true,
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ]);
        $eligible->assertCreated()
            ->assertJsonPath('data.applied_discount.name', 'Silver Reward');
        $this->assertEquals(10.0, (float) $eligible->json('data.discount_amount'));

        $walkIn = $this->actingAs($this->user)->postJson('/api/v1/orders', [
            'order_type' => 'takeaway',
            'auto_apply_promotions' => true,
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ]);
        $walkIn->assertCreated()->assertJsonPath('data.applied_discount', null);
        $this->assertEquals(0.0, (float) $walkIn->json('data.discount_amount'));
    }

    public function test_verified_discount_requires_confirmation_and_order_keeps_snapshot(): void
    {
        $discount = Discount::create([
            'name' => 'Senior Discount',
            'code' => 'SENIOR'.uniqid(),
            'type' => 'percentage',
            'value' => 20,
            'is_active' => true,
            'promotion_kind' => 'verified',
            'verification_required' => true,
            'applies_to' => 'all',
            'eligibility_type' => 'all',
            'start_date' => now()->subDay(),
            'end_date' => now()->addDay(),
        ]);
        $item = $this->menuItem();
        $payload = [
            'order_type' => 'takeaway',
            'discount_id' => $discount->id,
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ];

        $this->actingAs($this->user)
            ->postJson('/api/v1/orders', $payload)
            ->assertStatus(422);

        $created = $this->actingAs($this->user)
            ->postJson('/api/v1/orders', $payload + ['discount_verified' => true]);
        $created->assertCreated()
            ->assertJsonPath('data.applied_discount.name', 'Senior Discount')
            ->assertJsonPath('data.applied_discount.value', 20);

        $discount->update(['name' => 'Edited Later', 'value' => 5]);

        $this->actingAs($this->user)
            ->getJson('/api/v1/orders/'.$created->json('data.id'))
            ->assertOk()
            ->assertJsonPath('data.applied_discount.name', 'Senior Discount')
            ->assertJsonPath('data.applied_discount.value', 20);
    }

    private function menuItem(): MenuItem
    {
        $category = MenuCategory::create([
            'name' => 'Promo Category '.uniqid(),
            'slug' => 'promo-category-'.uniqid(),
        ]);

        return MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Promo Item '.uniqid(),
            'slug' => 'promo-item-'.uniqid(),
            'price' => 100,
        ]);
    }
}
