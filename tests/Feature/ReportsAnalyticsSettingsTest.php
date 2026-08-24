<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Ingredient;
use App\Models\Role;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ReportsAnalyticsSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(
            Role::firstOrCreate(['name' => $role], ['display_name' => $role, 'module' => 'system'])
        );

        return $user;
    }

    private function completedOrder(array $attributes = []): void
    {
        DB::table('orders')->insert(array_merge([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'order_number' => 'ORD-'.uniqid(),
            'order_type' => 'dine_in',
            'status' => 'completed',
            'subtotal' => 100,
            'tax_amount' => 12,
            'discount_amount' => 0,
            'service_charge' => 0,
            'total' => 112,
            'payment_status' => 'paid',
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ], $attributes));
    }

    // ==================== REPORT PERIODS ====================

    public function test_report_period_filter_only_includes_requested_range(): void
    {
        // One order today, one 10 days ago.
        $this->completedOrder(['total' => 200]);
        $this->completedOrder([
            'total' => 999,
            'created_at' => now()->subDays(10)->toDateTimeString(),
        ]);

        $admin = $this->userWithRole('admin');
        $response = $this->actingAs($admin)->getJson('/api/v1/reports/revenue?'.http_build_query([
            'start_date' => now()->toDateString(),
            'end_date' => now()->toDateString(),
        ]));

        $response->assertStatus(200);
        $this->assertEquals(200.0, $response->json('data.summary.total_revenue'));
    }

    public function test_single_day_range_is_valid_for_reports(): void
    {
        $this->completedOrder(['total' => 150]);

        $admin = $this->userWithRole('admin');
        $day = now()->toDateString();

        // end == start must be accepted (after_or_equal semantics).
        $this->actingAs($admin)
            ->getJson("/api/v1/reports/revenue?start_date={$day}&end_date={$day}")
            ->assertStatus(200);

        $this->actingAs($admin)
            ->postJson('/api/v1/reports/export', [
                'type' => 'revenue',
                'start_date' => $day,
                'end_date' => $day,
                'format' => 'csv',
            ])->assertStatus(200);
    }

    public function test_previous_period_revenue_is_the_equivalent_preceding_window(): void
    {
        // Today: revenue 300. Yesterday: revenue 500.
        $this->completedOrder(['total' => 300]);
        $this->completedOrder([
            'total' => 500,
            'created_at' => now()->subDay()->toDateTimeString(),
        ]);

        $admin = $this->userWithRole('admin');
        $today = now()->toDateString();

        $response = $this->actingAs($admin)->getJson('/api/v1/analytics/revenue?'.http_build_query([
            'date_range' => ['from' => $today, 'to' => $today],
        ]));

        $response->assertStatus(200);
        // Previous period for "today" is exactly yesterday.
        $this->assertEquals(500.0, $response->json('data.previous_period_revenue'));
        $this->assertEquals(-40.0, $response->json('data.revenue_growth')); // (300-500)/500
    }

    // ==================== INVENTORY USAGE COST ====================

    public function test_inventory_usage_cost_multiplies_quantity_by_unit_cost(): void
    {
        $ingredient = Ingredient::create([
            'name' => 'Flour',
            'unit' => 'kg',
            'current_stock' => 50,
            'minimum_stock' => 5,
            'cost_per_unit' => 10,
            'is_active' => true,
        ]);

        DB::table('stock_movements')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'ingredient_id' => $ingredient->id,
            'type' => 'outward',
            'quantity' => 5,
            'unit_cost' => 10,
            'notes' => 'consumption',
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ]);

        $admin = $this->userWithRole('admin');
        $response = $this->actingAs($admin)->getJson('/api/v1/analytics/inventory');

        $response->assertStatus(200);
        // 5 qty x 10 cost = 50 — not SUM(unit_cost) = 10.
        $this->assertEquals(50.0, $response->json('data.total_usage_cost'));
    }

    // ==================== PEAK HOURS SORTING ====================

    public function test_peak_hours_are_sorted_busiest_first(): void
    {
        // Two orders at 18:00 UTC-window and one at 09:00.
        $busyHour = now()->setTime(18, 0)->toDateTimeString();
        $quietHour = now()->setTime(9, 0)->toDateTimeString();
        $this->completedOrder(['created_at' => $busyHour]);
        $this->completedOrder(['created_at' => $busyHour]);
        $this->completedOrder(['created_at' => $quietHour]);

        $admin = $this->userWithRole('admin');
        $response = $this->actingAs($admin)->getJson('/api/v1/analytics/peak-hours');

        $response->assertStatus(200);
        $peakHours = $response->json('data.peak_hours');
        $this->assertNotEmpty($peakHours);

        // Busiest cell first: every subsequent entry has <= orders.
        for ($i = 1; $i < count($peakHours); $i++) {
            $this->assertLessThanOrEqual(
                $peakHours[$i - 1]['orders'],
                $peakHours[$i]['orders']
            );
        }
    }

    // ==================== SETTINGS RBAC + SHAPE ====================

    public function test_settings_payload_is_flat_and_updatable(): void
    {
        $admin = $this->userWithRole('admin');

        $this->actingAs($admin)->putJson('/api/v1/admin/settings', [
            'name' => 'Test Restaurant PH',
            'default_tax_rate' => 12,
            'default_service_charge' => 5,
            'service_charge_enabled' => true,
            'opening_hours' => ['monday' => ['open' => '09:00', 'close' => '21:00']],
        ])->assertStatus(200);

        $get = $this->actingAs($admin)->getJson('/api/v1/admin/settings');
        $get->assertStatus(200);

        // Flat contract: name/tax rate live directly on data.
        $get->assertJsonPath('data.name', 'Test Restaurant PH');
        $this->assertEquals(12.0, (float) $get->json('data.default_tax_rate'));
        $this->assertNull($get->json('data.data.restaurant'));
    }

    public function test_manager_can_view_but_not_modify_settings(): void
    {
        $manager = $this->userWithRole('manager');

        $this->actingAs($manager)->getJson('/api/v1/admin/settings')->assertStatus(200);

        $this->actingAs($manager)->putJson('/api/v1/admin/settings', [
            'name' => 'Manager Override',
        ])->assertStatus(403);
    }

    // ==================== AI INSIGHTS ====================

    public function test_ai_insights_require_admin_or_manager(): void
    {
        $cashier = $this->userWithRole('cashier');

        $this->actingAs($cashier)->postJson('/api/v1/analytics/insights', [
            'start_date' => now()->toDateString(),
            'end_date' => now()->toDateString(),
        ])->assertStatus(403);
    }

    public function test_ai_insights_degrade_gracefully_without_gemini_config(): void
    {
        // Force the unconfigured premise explicitly — the developer .env may
        // legitimately contain a working GEMINI_API_KEY.
        Config::set('services.gemini.key', null);

        $admin = $this->userWithRole('admin');

        $response = $this->actingAs($admin)->postJson('/api/v1/analytics/insights', [
            'start_date' => now()->subDays(2)->toDateString(),
            'end_date' => now()->toDateString(),
        ]);

        $response->assertStatus(200); // never a 5xx — core reporting unaffected
        $this->assertFalse($response->json('data.available'));
        $this->assertIsString($response->json('data.message'));
    }

    public function test_ai_insights_validate_date_range(): void
    {
        $admin = $this->userWithRole('admin');

        $this->actingAs($admin)->postJson('/api/v1/analytics/insights', [
            'start_date' => now()->toDateString(),
            'end_date' => now()->subDay()->toDateString(), // end before start
        ])->assertStatus(422);
    }

    // ==================== CSV EXPORT ====================

    public function test_export_streams_a_real_csv_file(): void
    {
        $this->completedOrder(['total' => 250]);
        $admin = $this->userWithRole('admin');

        $response = $this->actingAs($admin)->postJson('/api/v1/reports/export', [
            'type' => 'revenue',
            'start_date' => now()->toDateString(),
            'end_date' => now()->toDateString(),
            'format' => 'csv',
        ]);

        $response->assertStatus(200);
        $content = $response->streamedContent();
        $this->assertStringContainsString('Date,Revenue,Orders', $content);
        $this->assertStringContainsString((string) now()->toDateString(), $content);
        $this->assertStringNotContainsString('pending', $content);
    }
}
