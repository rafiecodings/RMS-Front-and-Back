<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Services\Forecasting\InsufficientHistoryException;
use App\Services\Forecasting\TimechoForecastService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TimechoForecastServiceTest extends TestCase
{
    use RefreshDatabase;

    private TimechoForecastService $service;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('services.timecho.api_key', 'test-key');
        Config::set('services.timecho.base_url', 'https://ai.timecho.test');
        Config::set('services.timecho.forecast_path', '/ai/api/v1/forecast');
        $this->service = app(TimechoForecastService::class);
    }

    private function history(int $days = 30): array
    {
        return array_map(fn ($i) => 10 + ($i % 5), range(1, $days));
    }

    private function startFor(int $days): string
    {
        return now()->subDays($days - 1)->toDateString();
    }

    private function timechoResponse(): array
    {
        return [
            'code' => 200,
            'message' => 'Forecast tasks completed successfully',
            'data' => [
                'results' => [[
                    'columns' => ['time', 'value'],
                    'data' => [
                        [now()->addDay()->format('Y-m-d\T00:00:00'), 120.5],
                        [now()->addDays(2)->format('Y-m-d\T00:00:00'), 130.0],
                        [now()->addDays(3)->format('Y-m-d\T00:00:00'), 125.0],
                    ],
                ]],
            ],
        ];
    }

    public function test_successful_forecast_is_normalized(): void
    {
        Http::fake([
            'ai.timecho.test/ai/api/v1/forecast' => Http::response($this->timechoResponse(), 200),
        ]);

        $result = $this->service->forecastDailySeries(
            $this->history(),
            $this->startFor(30),
            7,
            'daily_orders',
        );

        $this->assertCount(3, $result);
        $this->assertSame(now()->addDay()->toDateString(), $result[0]['date']);
        $this->assertEquals(120.5, $result[0]['predicted']);
        // Point forecasts only — no fabricated uncertainty bands.
        $this->assertNull($result[0]['lower']);
        $this->assertNull($result[0]['upper']);
    }

    public function test_request_uses_documented_contract(): void
    {
        Http::fake([
            'ai.timecho.test/ai/api/v1/forecast' => Http::response($this->timechoResponse(), 200),
        ]);

        $history = $this->history(20);
        $this->service->forecastDailySeries($history, $this->startFor(20), 14, 'daily_orders');

        $this->assertTrue(Http::recorded()->isNotEmpty());
        [$request] = Http::recorded()[0];

        $this->assertSame('https://ai.timecho.test/ai/api/v1/forecast', $request->url());
        // Bearer auth header present (value never asserted).
        $this->assertStringStartsWith('Bearer ', (string) $request->header('Authorization')[0]);
        $this->assertSame('application/json', (string) $request->header('Content-Type')[0]);

        $body = $request->data();
        $this->assertSame(['time', 'daily_orders'], $body['targets'][0]['columns']);
        // Documented row shape: [timestamp, value].
        $expectedStart = \Carbon\Carbon::parse($this->startFor(20))->format('Y-m-d\T00:00:00');
        $this->assertSame(
            [[$expectedStart, (float) $history[0]], ['2026-08-06T00:00:00', (float) $history[1]]],
            array_slice($body['targets'][0]['data'], 0, 2),
        );
        $this->assertCount(count($history), $body['targets'][0]['data']);
        $this->assertSame([14], $body['output_length']);
        $this->assertSame(['time'], $body['time_col']);
    }

    public function test_horizon_thirty_maps_to_output_length(): void
    {
        Http::fake([
            'ai.timecho.test/ai/api/v1/forecast' => Http::response($this->timechoResponse(), 200),
        ]);

        $this->service->forecastDailySeries($this->history(), $this->startFor(30), 30);

        [$request] = Http::recorded()[0];
        $this->assertSame([30], $request->data()['output_length']);
    }

    public function test_no_undocumented_model_field_is_sent(): void
    {
        Http::fake([
            'ai.timecho.test/ai/api/v1/forecast' => Http::response($this->timechoResponse(), 200),
        ]);

        $this->service->forecastDailySeries($this->history(), $this->startFor(30), 7);

        [$request] = Http::recorded()[0];
        $body = $request->data();
        // REST contract documents no model field — auto/default is used.
        $this->assertArrayNotHasKey('model', $body);
        $this->assertArrayNotHasKey('model_id', $body);
    }

    public function test_insufficient_history_throws_without_calling_api(): void
    {
        Http::fake(['ai.timecho.test/*' => Http::response([], 200)]);

        $this->expectException(InsufficientHistoryException::class);

        try {
            $this->service->forecastDailySeries($this->history(10), $this->startFor(10), 7);
        } finally {
            Http::assertNothingSent();
        }
    }

    public function test_missing_api_key_throws_before_any_http(): void
    {
        Config::set('services.timecho.api_key', null);
        Http::fake(['ai.timecho.test/*' => Http::response([], 200)]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('TimechoAI is not configured.');

        try {
            $this->service->forecastDailySeries($this->history(), $this->startFor(30), 7);
        } finally {
            Http::assertNothingSent();
        }
    }

    public function test_upstream_401_throws_auth_error(): void
    {
        Http::fake(['ai.timecho.test/*' => Http::response(['message' => 'unauthorized'], 401)]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Forecast authentication failed.');

        $this->service->forecastDailySeries($this->history(), $this->startFor(30), 7);
    }

    public function test_rate_limit_throws(): void
    {
        Http::fake(['ai.timecho.test/*' => Http::response(['message' => 'quota exceeded'], 429)]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Forecast quota/rate limit reached.');

        $this->service->forecastDailySeries($this->history(), $this->startFor(30), 7);
    }

    public function test_server_error_throws(): void
    {
        Http::fake(['ai.timecho.test/*' => Http::response('oops', 500)]);

        $this->expectException(\RuntimeException::class);

        $this->service->forecastDailySeries($this->history(), $this->startFor(30), 7);
    }

    public function test_timeout_throws_unreachable(): void
    {
        Http::fake(function () {
            throw new ConnectionException('connection timed out');
        });

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Forecast service unreachable.');

        $this->service->forecastDailySeries($this->history(), $this->startFor(30), 7);
    }

    public function test_malformed_response_throws(): void
    {
        Http::fake([
            'ai.timecho.test/*' => Http::response(['unexpected' => 'shape'], 200),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Malformed forecast response.');

        $this->service->forecastDailySeries($this->history(), $this->startFor(30), 7);
    }

    public function test_non_200_code_is_malformed(): void
    {
        Http::fake([
            'ai.timecho.test/*' => Http::response([
                'code' => 500,
                'message' => 'internal error',
            ], 200),
        ]);

        $this->expectException(\RuntimeException::class);

        $this->service->forecastDailySeries($this->history(), $this->startFor(30), 7);
    }

    // ==================== ENDPOINT: CACHING + RBAC ====================

    private function seedOrderHistory(int $days = 40): void
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
                'updated_at' => now()->toDateTimeString(),
            ]);
        }
    }

    public function test_cache_prevents_duplicate_provider_calls(): void
    {
        Config::set('services.timecho.api_key', 'test-key');
        Http::fake([
            'ai.timecho.test/ai/api/v1/forecast' => Http::response($this->timechoResponse(), 200),
        ]);
        $this->seedOrderHistory();

        $admin = User::factory()->create();
        $admin->roles()->attach(
            Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'admin', 'module' => 'system'])
        );

        $this->actingAs($admin)
            ->getJson('/api/v1/analytics/demand-forecast?horizon=7')
            ->assertStatus(200)
            ->assertJsonPath('data.available', true)
            ->assertJsonPath('data.cached', false);

        $callsAfterFirst = count(Http::recorded());

        // Second request within the cache window must NOT hit the provider.
        $this->actingAs($admin)
            ->getJson('/api/v1/analytics/demand-forecast?horizon=7')
            ->assertStatus(200)
            ->assertJsonPath('data.available', true)
            ->assertJsonPath('data.cached', true);

        $this->assertSame($callsAfterFirst, count(Http::recorded()));
    }

    public function test_forecast_endpoint_requires_admin_or_manager(): void
    {
        $cashier = User::factory()->create();
        $cashier->roles()->attach(
            Role::firstOrCreate(['name' => 'cashier'], ['display_name' => 'cashier', 'module' => 'system'])
        );

        $this->actingAs($cashier)
            ->getJson('/api/v1/analytics/demand-forecast?horizon=7')
            ->assertStatus(403);
    }

    public function test_inventory_staff_can_access_ingredient_scope_route(): void
    {
        Config::set('services.timecho.api_key', null); // graceful unavailable path
        $staff = User::factory()->create();
        $staff->roles()->attach(
            Role::firstOrCreate(['name' => 'inventory_staff'], ['display_name' => 'inventory_staff', 'module' => 'system'])
        );

        $this->actingAs($staff)
            ->getJson('/api/v1/inventory/demand-forecast?scope=ingredients&horizon=7')
            ->assertStatus(200)
            ->assertJsonPath('data.available', false)
            ->assertJsonPath('data.reason', 'provider_unavailable');
    }

    public function test_sales_forecast_reports_insufficient_history_without_quota_spend(): void
    {
        Http::fake(['ai.timecho.test/*' => Http::response($this->timechoResponse(), 200)]);
        $admin = User::factory()->create();
        $admin->roles()->attach(
            Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'admin', 'module' => 'system'])
        );

        // No orders seeded.
        $this->actingAs($admin)
            ->getJson('/api/v1/analytics/demand-forecast?horizon=7')
            ->assertStatus(200)
            ->assertJsonPath('data.available', false)
            ->assertJsonPath('data.reason', 'insufficient_history');

        Http::assertNothingSent();
    }
}
