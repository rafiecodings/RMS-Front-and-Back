<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * TimechoAI integration: provider success/failure paths, automatic local
 * fallback, quota protection and shared caching.
 *
 * phpunit.xml blanks TIMECHO_API_KEY by default; each test that exercises the
 * provider sets config('services.timecho.api_key') explicitly + Http::fake().
 */
class TimechoIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    /** Number of outbound HTTP requests recorded by Http::fake(). */
    private function providerCallCount(): int
    {
        return collect(Http::recorded())->count();
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(
            Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Admin', 'module' => 'system'])
        );
    }

    /** Seeds N days of completed orders (>= 14 non-zero days). */
    private function seedHistory(int $days = 30): void
    {
        // Raw insert: Order::$fillable intentionally excludes created_at, and
        // this test needs explicit historical timestamps.
        for ($i = $days; $i >= 1; $i--) {
            \Illuminate\Support\Facades\DB::table('orders')->insert([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'order_number' => 'ORD-'.uniqid(),
                'order_type' => 'takeaway',
                'status' => 'completed',
                'payment_status' => 'paid',
                'subtotal' => 100,
                'total' => 100,
                'created_at' => now()->subDays($i)->format('Y-m-d H:i:s'),
                'updated_at' => now()->format('Y-m-d H:i:s'),
            ]);
        }
    }

    private function enableProvider(): void
    {
        config(['services.timecho.api_key' => 'test-key-123']);
    }

    private function successfulProviderBody(): array
    {
        // Shape observed from the live API on 2026-08-26:
        // top-level code/message/service_info/data; results[0] carries
        // columns/data/quantile_levels/quantile_forecasts. Point forecasts
        // are [ISO timestamp, value] rows.
        $rows = [];
        foreach (range(1, 7) as $i) {
            $rows[] = [now()->addDays($i)->format('Y-m-d\T00:00:00'), 5.0 + $i];
        }

        return [
            'code' => 200,
            'message' => 'ok',
            'service_info' => ['model' => 'Timer-3.5'],
            'data' => [
                'results' => [
                    [
                        'columns' => ['time', 'daily_orders'],
                        'data' => $rows,
                        'quantile_levels' => [],
                        'quantile_forecasts' => [],
                    ],
                ],
            ],
        ];
    }

    // ------------------------------------------------------------------

    public function test_provider_success_uses_timecho_output(): void
    {
        $this->seedHistory();
        $this->enableProvider();
        Http::fake([
            'ai.timecho.com/*' => Http::response($this->successfulProviderBody(), 200),
        ]);

        $res = $this->actingAs($this->admin)
            ->getJson('/api/v1/analytics/demand-forecast?horizon=7');

        $res->assertStatus(200)
            ->assertJsonPath('data.available', true)
            ->assertJsonPath('data.model', 'timecho')
            ->assertJsonPath('data.provider', 'timecho')
            ->assertJsonCount(7, 'data.forecast');

        // Point forecasts: bands stay null (provider returns none).
        $first = $res->json('data.forecast.0');
        $this->assertEquals(6.0, $first['predicted_orders']);
        $this->assertNull($first['lower_orders']);
        $this->assertNull($first['upper_orders']);

        $this->assertSame(1, $this->providerCallCount());
    }

    public function test_auth_failure_falls_back_to_local_forecast(): void
    {
        $this->seedHistory();
        $this->enableProvider();
        Http::fake(['ai.timecho.com/*' => Http::response(['error' => 'unauthorized'], 401)]);

        $res = $this->actingAs($this->admin)
            ->getJson('/api/v1/analytics/demand-forecast?horizon=7');

        $res->assertStatus(200)
            ->assertJsonPath('data.available', true)
            ->assertJsonPath('data.model', 'local-weighted-average')
            ->assertJsonCount(7, 'data.forecast');
    }

    public function test_rate_limit_falls_back_to_local_forecast(): void
    {
        $this->seedHistory();
        $this->enableProvider();
        Http::fake(['ai.timecho.com/*' => Http::response(['error' => 'quota'], 429)]);

        $this->actingAs($this->admin)
            ->getJson('/api/v1/analytics/demand-forecast?horizon=7')
            ->assertStatus(200)
            ->assertJsonPath('data.model', 'local-weighted-average');
    }

    public function test_server_error_falls_back_to_local_forecast(): void
    {
        $this->seedHistory();
        $this->enableProvider();
        Http::fake(['ai.timecho.com/*' => Http::response(['attempts' => 1, 'error' => 'all_attempts_failed'], 503)]);

        $this->actingAs($this->admin)
            ->getJson('/api/v1/analytics/demand-forecast?horizon=7')
            ->assertStatus(200)
            ->assertJsonPath('data.available', true)
            ->assertJsonPath('data.model', 'local-weighted-average');
    }

    public function test_timeout_falls_back_to_local_forecast(): void
    {
        $this->seedHistory();
        $this->enableProvider();
        Http::fake(function () {
            throw new \Illuminate\Http\Client\ConnectionException('timeout');
        });

        $this->actingAs($this->admin)
            ->getJson('/api/v1/analytics/demand-forecast?horizon=7')
            ->assertStatus(200)
            ->assertJsonPath('data.available', true)
            ->assertJsonPath('data.model', 'local-weighted-average');
    }

    public function test_malformed_json_falls_back_to_local_forecast(): void
    {
        $this->seedHistory();
        $this->enableProvider();
        // 200 with a body that fails normalization (missing results).
        Http::fake(['ai.timecho.com/*' => Http::response(['code' => 200], 200)]);

        $this->actingAs($this->admin)
            ->getJson('/api/v1/analytics/demand-forecast?horizon=7')
            ->assertStatus(200)
            ->assertJsonPath('data.available', true)
            ->assertJsonPath('data.model', 'local-weighted-average');
    }

    public function test_insufficient_history_never_calls_provider(): void
    {
        // Only 3 days of history: below the 14-day minimum.
        $this->seedHistory(days: 3);
        $this->enableProvider();
        Http::fake(['ai.timecho.com/*' => Http::response($this->successfulProviderBody(), 200)]);

        $res = $this->actingAs($this->admin)
            ->getJson('/api/v1/analytics/demand-forecast?horizon=7');

        $res->assertStatus(200)
            ->assertJsonPath('data.available', false)
            ->assertJsonPath('data.reason', 'insufficient_history');

        // Quota must NOT be spent.
        $this->assertSame(0, $this->providerCallCount());
    }

    public function test_unconfigured_key_skips_provider_and_uses_local(): void
    {
        $this->seedHistory();
        // NOTE: no enableProvider() - key stays blank from phpunit.xml.
        Http::fake(['ai.timecho.com/*' => Http::response($this->successfulProviderBody(), 200)]);

        $this->actingAs($this->admin)
            ->getJson('/api/v1/analytics/demand-forecast?horizon=7')
            ->assertStatus(200)
            ->assertJsonPath('data.model', 'local-weighted-average');

        $this->assertSame(0, $this->providerCallCount());
    }

    public function test_second_request_is_served_from_cache(): void
    {
        $this->seedHistory();
        $this->enableProvider();
        Http::fake(['ai.timecho.com/*' => Http::response($this->successfulProviderBody(), 200)]);

        $first = $this->actingAs($this->admin)
            ->getJson('/api/v1/analytics/demand-forecast?horizon=7');
        $first->assertStatus(200);
        // Fresh compute carries no cached flag (or false); never true.
        $this->assertTrue(! $first->json('data.cached'));

        // Second identical request: served from cache, cached=true flagged,
        // and NO additional provider call.
        $second = $this->actingAs($this->admin)
            ->getJson('/api/v1/analytics/demand-forecast?horizon=7');
        $second->assertStatus(200);
        $this->assertTrue($second->json('data.cached'));
        $this->assertSame(
            $first->json('data.generated_at'),
            $second->json('data.generated_at'),
            'Cached payload must be byte-identical to the original.'
        );

        $this->assertSame(1, $this->providerCallCount());
    }

    public function test_negative_provider_predictions_are_clamped(): void
    {
        $this->seedHistory();
        $this->enableProvider();

        $body = $this->successfulProviderBody();
        $body['data']['results'][0]['data'][2][1] = -3.5; // negative forecast row

        Http::fake(['ai.timecho.com/*' => Http::response($body, 200)]);

        $res = $this->actingAs($this->admin)
            ->getJson('/api/v1/analytics/demand-forecast?horizon=7');

        $res->assertStatus(200);
        $this->assertEquals(0.0, $res->json('data.forecast.2.predicted_orders'));
    }
}
