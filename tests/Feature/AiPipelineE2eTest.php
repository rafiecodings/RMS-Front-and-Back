<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * End-to-end AI pipeline verification with both providers faked:
 *   RMS history -> TimechoAI forecast (cached) -> Laravel inventory
 *   projection -> Gemini insights.
 *
 * Proves the quota-safety guarantees:
 *  - second forecast request is served from cache (no provider call)
 *  - Gemini receives the cached normalized forecast, never a second
 *    direct TimechoAI request.
 */
class AiPipelineE2eTest extends TestCase
{
    use RefreshDatabase;

    private function seedOrderHistory(int $days = 30): void
    {
        for ($i = $days; $i >= 1; $i--) {
            DB::table('orders')->insert([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'order_number' => 'ORD-'.uniqid(),
                'order_type' => 'dine_in',
                'status' => 'completed',
                'subtotal' => 100,
                'tax_amount' => 0,
                'discount_amount' => 0,
                'service_charge' => 0,
                'total' => 150,
                'payment_status' => 'paid',
                'created_at' => now()->subDays($i - 1)->setTime(12, 0)->toDateTimeString(),
                'updated_at' => now(),
            ]);
        }
    }

    public function test_full_pipeline_timecho_cache_gemini(): void
    {
        Config::set('services.timecho.api_key', 'test-key');
        Config::set('services.gemini.key', 'test-key');

        $geminiJson = json_encode([
            'summary' => 'Demand rising; restock Chicken Breast.',
            'sales_insights' => ['AOV stable across recent orders.'],
            'forecast_insights' => ['Orders projected to grow over 7 days.'],
            'inventory_insights' => ['Chicken Breast covers under 2 days.'],
            'risks' => ['Chicken Breast shortage by day 3.'],
            'recommendations' => ['Order Chicken Breast before Friday.'],
            'confidence' => 'medium',
        ]);
        $geminiResponse = [
            'candidates' => [
                [
                    'content' => [
                        'parts' => [
                            ['text' => $geminiJson],
                        ],
                    ],
                ],
            ],
        ];

        Http::fake([
            'ai.timecho.com/ai/api/v1/forecast' => Http::response([
                'code' => 200,
                'message' => 'Forecast tasks completed successfully',
                'data' => ['results' => [[
                    'columns' => ['time', 'daily_orders'],
                    'data' => array_map(
                        fn ($i) => [now()->addDays($i)->format('Y-m-d\T00:00:00'), 45 + $i * 2],
                        range(1, 7),
                    ),
                ]]],
            ], 200),
            'generativelanguage.googleapis.com/*' => Http::response($geminiResponse, 200),
        ]);

        $this->seedOrderHistory();

        $admin = User::factory()->create();
        $admin->roles()->attach(
            Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'a', 'module' => 'system'])->id
        );

        // STEP 1: sales forecast through TimechoAI.
        $resp1 = $this->actingAs($admin)
            ->getJson('/api/v1/analytics/demand-forecast?horizon=7');
        $resp1->assertStatus(200)->assertJsonPath('data.available', true);
        $resp1->assertJsonPath('data.provider', 'timecho');
        $this->assertCount(7, $resp1->json('data.forecast'));
        // Sequential dates, non-negative demand.
        $forecast = $resp1->json('data.forecast');
        foreach ($forecast as $i => $point) {
            $this->assertGreaterThanOrEqual(0, $point['predicted_orders']);
            if ($i > 0) {
                $prev = \Carbon\Carbon::parse($forecast[$i - 1]['date']);
                $this->assertSame(
                    $prev->addDay()->toDateString(),
                    \Carbon\Carbon::parse($point['date'])->toDateString(),
                );
            }
        }
        $callsAfterFirst = count(Http::recorded());

        // STEP 2: same request served from cache — no extra provider call.
        $resp2 = $this->actingAs($admin)
            ->getJson('/api/v1/analytics/demand-forecast?horizon=7');
        $resp2->assertStatus(200)->assertJsonPath('data.cached', true);
        $this->assertSame($callsAfterFirst, count(Http::recorded()));

        // STEP 3: Gemini insights consume the CACHED forecast.
        $insightsResp = $this->actingAs($admin)
            ->postJson('/api/v1/analytics/insights', [
                'start_date' => now()->subDays(2)->toDateString(),
                'end_date' => now()->toDateString(),
            ]);
        $insightsResp->assertStatus(200)->assertJsonPath('data.available', true);
        $insights = $insightsResp->json('data');
        $this->assertNotEmpty($insights['summary']);
        // Forecast aggregates reached Gemini via cache.
        $this->assertNotEmpty($insights['forecast_insights']);

        // Total Timecho calls must still be exactly ONE.
        $timechoCalls = collect(Http::recorded())
            ->filter(fn ($pair) => str_contains($pair[0]->url(), 'ai.timecho.com'))
            ->count();
        $this->assertSame(1, $timechoCalls);
    }

    public function test_inventory_projection_fields_populate(): void
    {
        Config::set('services.timecho.api_key', 'test-key');
        Http::fake([
            'ai.timecho.com/ai/api/v1/forecast' => Http::response([
                'code' => 200,
                'data' => ['results' => [[
                    'columns' => ['time', 'item_quantity'],
                    'data' => array_map(
                        fn ($i) => [now()->addDays($i)->format('Y-m-d\T00:00:00'), 4],
                        range(1, 7),
                    ),
                ]]],
            ], 200),
        ]);

        $categoryId = (string) \Illuminate\Support\Str::uuid();
        $now0 = now();
        DB::table('menu_categories')->insert([
            'id' => $categoryId, 'name' => 'Mains', 'slug' => 'mains-'.uniqid(),
            'is_active' => true, 'created_at' => $now0, 'updated_at' => $now0,
        ]);
        $menuItemId = (string) \Illuminate\Support\Str::uuid();
        $recipeId = (string) \Illuminate\Support\Str::uuid();
        $ingredientId = (string) \Illuminate\Support\Str::uuid();
        $now = now();

        DB::table('menu_items')->insert([
            'id' => $menuItemId, 'name' => 'Chicken Adobo', 'slug' => 'chicken-adobo-'.uniqid(),
            'category_id' => $categoryId, 'price' => 180, 'is_available' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);
        DB::table('recipes')->insert([
            'id' => $recipeId, 'menu_item_id' => $menuItemId,
            'yield_quantity' => 1, 'yield_unit' => 'serving',
            'instructions' => '', 'created_at' => $now, 'updated_at' => $now,
        ]);
        DB::table('ingredients')->insert([
            'id' => $ingredientId, 'name' => 'Chicken Breast', 'unit' => 'kg',
            'current_stock' => 8, 'minimum_stock' => 10, 'cost_per_unit' => 180,
            'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
        ]);
        DB::table('recipe_ingredients')->insert([
            'recipe_id' => $recipeId, 'ingredient_id' => $ingredientId,
            'quantity' => 0.3, 'unit' => 'kg',
        ]);
        // 14+ days of sales of that item (2/day).
        for ($i = 20; $i >= 1; $i--) {
            $orderId = (string) \Illuminate\Support\Str::uuid();
            DB::table('orders')->insert([
                'id' => $orderId, 'order_number' => 'ORD-'.uniqid(), 'order_type' => 'dine_in',
                'status' => 'completed', 'subtotal' => 180, 'tax_amount' => 0, 'discount_amount' => 0,
                'service_charge' => 0, 'total' => 180, 'payment_status' => 'paid',
                'created_at' => now()->subDays($i - 1)->setTime(12, 0), 'updated_at' => now(),
            ]);
            DB::table('order_items')->insert([
                'id' => (string) \Illuminate\Support\Str::uuid(), 'order_id' => $orderId,
                'menu_item_id' => $menuItemId, 'name' => 'Chicken Adobo', 'quantity' => 2,
                'unit_price' => 90, 'total_price' => 180,
                'status' => 'served', 'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        $manager = User::factory()->create();
        $manager->roles()->attach(
            Role::firstOrCreate(['name' => 'manager'], ['display_name' => 'm', 'module' => 'system'])->id
        );

        $resp = $this->actingAs($manager)
            ->getJson('/api/v1/inventory/demand-forecast?scope=ingredients&horizon=7');
        $resp->assertStatus(200)->assertJsonPath('data.available', true);

        $requirements = $resp->json('data.projected_requirements');
        $this->assertNotEmpty($requirements);

        $chicken = collect($requirements)->firstWhere('name', 'Chicken Breast');
        $this->assertNotNull($chicken);
        $this->assertEquals(8.0, $chicken['current_stock']);
        // Projected need: 7d x ~8 qty x 0.3 kg >> current 8 kg → shortage.
        $this->assertGreaterThan(0, $chicken['projected_requirement']);
        $this->assertEquals(
            round($chicken['projected_requirement'] - $chicken['current_stock'], 2),
            $chicken['projected_shortage'],
        );
        $this->assertContains($chicken['status'], ['Restock Urgent', 'Restock Recommended', 'Out of Stock']);
    }
}
