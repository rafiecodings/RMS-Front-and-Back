<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Live RBAC matrix for AI endpoints, enforced at the HTTP/route layer.
 *
 * Admin/Manager      -> demand forecast, AI insights, inventory forecast
 * Inventory Staff    -> inventory forecast ONLY
 * Waiter/Cashier/Kitchen -> 403 everywhere
 */
class AiRbacMatrixTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(
            Role::firstOrCreate(['name' => $role], ['display_name' => $role, 'module' => 'system'])->id
        );

        return $user;
    }

    private function fakeProviders(): void
    {
        $geminiJson = json_encode([
            'summary' => 'ok',
            'sales_insights' => [],
            'forecast_insights' => [],
            'inventory_insights' => [],
            'risks' => [],
            'recommendations' => [],
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
            'ai.timecho.com/*' => Http::response([
                'code' => 200,
                'data' => ['results' => [[
                    'columns' => ['time', 'v'],
                    'data' => [[now()->addDay()->format('Y-m-d\T00:00:00'), 10]],
                ]]],
            ], 200),
            'generativelanguage.googleapis.com/*' => Http::response($geminiResponse, 200),
        ]);
    }

    public function test_ai_rbac_matrix(): void
    {
        Config::set('services.timecho.api_key', 'test-key');
        Config::set('services.gemini.key', 'test-key');
        $this->fakeProviders();

        // Seed minimal history so authorized forecasts succeed.
        for ($i = 20; $i >= 1; $i--) {
            DB::table('orders')->insert([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'order_number' => 'ORD-'.uniqid(),
                'order_type' => 'dine_in',
                'status' => 'completed',
                'subtotal' => 100,
                'tax_amount' => 0,
                'discount_amount' => 0,
                'service_charge' => 0,
                'total' => 120,
                'payment_status' => 'paid',
                'created_at' => now()->subDays($i - 1)->setTime(12, 0),
                'updated_at' => now(),
            ]);
        }

        $matrix = [
            'admin' => [200, 200, 200],
            'manager' => [200, 200, 200],
            'inventory_staff' => [403, 403, 200],
            'waiter' => [403, 403, 403],
            'cashier' => [403, 403, 403],
            'kitchen_staff' => [403, 403, 403],
        ];

        foreach ($matrix as $role => [$dfExpected, $aiExpected, $invExpected]) {
            $user = $this->userWithRole($role);

            $df = $this->actingAs($user)
                ->getJson('/api/v1/analytics/demand-forecast?horizon=7')
                ->getStatusCode();

            $ai = $this->actingAs($user)
                ->postJson('/api/v1/analytics/insights', [
                    'start_date' => now()->subDays(2)->toDateString(),
                    'end_date' => now()->toDateString(),
                ])
                ->getStatusCode();

            $inv = $this->actingAs($user)
                ->getJson('/api/v1/inventory/demand-forecast?scope=ingredients&horizon=7')
                ->getStatusCode();

            $this->assertSame($dfExpected, $df, "{$role}: demand forecast {$df}");
            $this->assertSame($aiExpected, $ai, "{$role}: insights {$ai}");
            $this->assertSame($invExpected, $inv, "{$role}: inventory forecast {$inv}");
        }
    }
}
