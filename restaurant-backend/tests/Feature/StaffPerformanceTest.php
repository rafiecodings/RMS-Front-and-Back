<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Order;
use App\Models\Role;
use App\Models\StaffCommission;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class StaffPerformanceTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = $this->createUserWithRole('admin');
        $this->manager = $this->createUserWithRole('manager');
    }

    public function test_a_admin_views_any_performance(): void
    {
        $target = $this->createStaffProfile();
        $this->actingAs($this->admin)->getJson("/api/v1/staff/{$target->id}/performance")->assertStatus(200)->assertJsonPath('data.staff.id', $target->id);
    }

    public function test_b_manager_views_any(): void
    {
        $target = $this->createStaffProfile();
        $this->actingAs($this->manager)->getJson("/api/v1/staff/{$target->id}/performance")->assertStatus(200);
    }

    public function test_c_operational_views_own(): void
    {
        $waiter = $this->createUserWithRole('waiter');
        $own = $this->createStaffProfile(user: $waiter);
        $this->actingAs($waiter)->getJson("/api/v1/staff/{$own->id}/performance")->assertStatus(200)->assertJsonPath('data.staff.id', $own->id);
    }

    public function test_d_cross_staff_forbidden(): void
    {
        $waiter = $this->createUserWithRole('waiter');
        $this->createStaffProfile(user: $waiter);
        $other = $this->createStaffProfile();
        $this->actingAs($waiter)->getJson("/api/v1/staff/{$other->id}/performance")->assertStatus(403);
    }

    public function test_e_missing_profile_returns_404(): void
    {
        $fake = \Illuminate\Support\Str::uuid()->toString();
        $this->actingAs($this->admin)->getJson("/api/v1/staff/{$fake}/performance")->assertStatus(404);
    }

    public function test_f_no_rows_does_not_crash(): void
    {
        $p = $this->createStaffProfile();
        $this->actingAs($this->admin)->getJson("/api/v1/staff/{$p->id}/performance?start_date=2026-01-01&end_date=2026-01-31")->assertStatus(200)->assertJsonPath('data.orders_handled', 0)->assertJsonPath('data.total_sales', 0);
    }

    public function test_g_completed_orders_counted(): void
    {
        $user = $this->createUserWithRole('waiter');
        $staff = $this->createStaffProfile(user: $user);
        $this->createOrder($user->id, 'completed', 500);
        $this->createOrder($user->id, 'completed', 300);
        $this->actingAs($this->admin)->getJson("/api/v1/staff/{$staff->id}/performance")->assertStatus(200)->assertJsonPath('data.orders_handled', 2)->assertJsonPath('data.total_sales', 800);
    }

    public function test_h_cancelled_excluded(): void
    {
        $user = $this->createUserWithRole('waiter');
        $staff = $this->createStaffProfile(user: $user);
        $this->createOrder($user->id, 'cancelled', 1000);
        $this->actingAs($this->admin)->getJson("/api/v1/staff/{$staff->id}/performance")->assertStatus(200)->assertJsonPath('data.orders_handled', 0);
    }

    public function test_i_voided_excluded(): void
    {
        $user = $this->createUserWithRole('waiter');
        $staff = $this->createStaffProfile(user: $user);
        $this->createOrder($user->id, 'voided', 1000);
        $this->actingAs($this->admin)->getJson("/api/v1/staff/{$staff->id}/performance")->assertStatus(200)->assertJsonPath('data.orders_handled', 0);
    }

    public function test_j_unpaid_incomplete_not_counted(): void
    {
        $user = $this->createUserWithRole('waiter');
        $staff = $this->createStaffProfile(user: $user);
        $this->createOrder($user->id, 'pending', 200);
        $this->createOrder($user->id, 'confirmed', 200);
        $this->actingAs($this->admin)->getJson("/api/v1/staff/{$staff->id}/performance")->assertStatus(200)->assertJsonPath('data.orders_handled', 0);
    }

    public function test_k_date_range_filters(): void
    {
        $user = $this->createUserWithRole('waiter');
        $staff = $this->createStaffProfile(user: $user);
        $o1 = $this->createOrder($user->id, 'completed', 100);
        \Illuminate\Support\Facades\DB::table('orders')->where('id', $o1->id)->update(['created_at' => '2026-02-01 10:00:00', 'updated_at' => '2026-02-01 10:00:00']);
        $o2 = $this->createOrder($user->id, 'completed', 200);
        \Illuminate\Support\Facades\DB::table('orders')->where('id', $o2->id)->update(['created_at' => '2026-03-01 10:00:00', 'updated_at' => '2026-03-01 10:00:00']);
        $this->actingAs($this->admin)->getJson("/api/v1/staff/{$staff->id}/performance?start_date=2026-02-01&end_date=2026-02-28")->assertStatus(200)->assertJsonPath('data.orders_handled', 1)->assertJsonPath('data.total_sales', 100);
    }

    public function test_l_hours_sourced(): void
    {
        $staff = $this->createStaffProfile();
        Attendance::create(['staff_id' => $staff->id, 'clock_in' => '2026-04-01 09:00:00', 'clock_out' => '2026-04-01 17:00:00', 'hours_worked' => 8, 'status' => 'present']);
        Attendance::create(['staff_id' => $staff->id, 'clock_in' => '2026-04-02 09:00:00', 'clock_out' => '2026-04-02 17:00:00', 'hours_worked' => 8, 'status' => 'present']);
        $this->actingAs($this->admin)->getJson("/api/v1/staff/{$staff->id}/performance?start_date=2026-04-01&end_date=2026-04-30")->assertStatus(200)->assertJsonPath('data.hours_worked', 16)->assertJsonPath('data.days_present', 2);
    }

    public function test_m_contract_only_supported_metrics(): void
    {
        $p = $this->createStaffProfile();
        $res = $this->actingAs($this->admin)->getJson("/api/v1/staff/{$p->id}/performance")->assertStatus(200);
        $data = $res->json('data');
        $this->assertArrayHasKey('staff', $data);
        $this->assertArrayHasKey('period', $data);
        $this->assertArrayHasKey('orders_handled', $data);
        $this->assertArrayHasKey('total_sales', $data);
        $this->assertArrayHasKey('hours_worked', $data);
        $this->assertArrayHasKey('days_present', $data);
        $this->assertArrayNotHasKey('tables_served', $data);
        $this->assertArrayNotHasKey('customer_feedback_count', $data);
        $this->assertArrayNotHasKey('attendance_rate', $data);
    }

    public function test_n_commission_own_access(): void
    {
        $waiter = $this->createUserWithRole('waiter');
        $own = $this->createStaffProfile(user: $waiter);
        $this->actingAs($waiter)->getJson("/api/v1/staff/{$own->id}/commissions")->assertStatus(200);
    }

    public function test_o_commission_cross_staff_forbidden(): void
    {
        $waiter = $this->createUserWithRole('waiter');
        $this->createStaffProfile(user: $waiter);
        $other = $this->createStaffProfile();
        $this->actingAs($waiter)->getJson("/api/v1/staff/{$other->id}/commissions")->assertStatus(403);
    }

    public function test_p_empty_commissions_safe(): void
    {
        $p = $this->createStaffProfile();
        $this->actingAs($this->admin)->getJson("/api/v1/staff/{$p->id}/commissions")->assertStatus(200)->assertJsonPath('data.total_commission', 0)->assertJsonPath('data.items', []);
    }

    public function test_q_cancelled_commission_excluded(): void
    {
        $p = $this->createStaffProfile();
        $user = User::factory()->create();
        $order = Order::create(['order_number' => 'ORD-'.uniqid(), 'order_type' => 'dine_in', 'status' => 'cancelled', 'payment_status' => 'unpaid', 'subtotal' => 100, 'total' => 100, 'created_by' => $user->id]);
        StaffCommission::create(['staff_id' => $p->id, 'order_id' => $order->id, 'amount' => 50, 'type' => 'sales']);
        $order2 = Order::create(['order_number' => 'ORD-'.uniqid(), 'order_type' => 'dine_in', 'status' => 'completed', 'payment_status' => 'paid', 'subtotal' => 100, 'total' => 100, 'created_by' => $user->id]);
        StaffCommission::create(['staff_id' => $p->id, 'order_id' => $order2->id, 'amount' => 30, 'type' => 'sales']);
        $this->actingAs($this->admin)->getJson("/api/v1/staff/{$p->id}/commissions")->assertStatus(200)->assertJsonPath('data.total_commission', 30);
    }

    public function test_r_reports_still_admin_manager_only(): void
    {
        $waiter = $this->createUserWithRole('waiter');
        $this->actingAs($waiter)->getJson('/api/v1/reports/staff')->assertStatus(403);
        $this->actingAs($this->admin)->getJson('/api/v1/reports/staff')->assertStatus(200);
    }

    public function test_s_reports_consistent_with_individual(): void
    {
        $user = $this->createUserWithRole('waiter');
        $staff = $this->createStaffProfile(user: $user);
        $o = $this->createOrder($user->id, 'completed', 400);
        \Illuminate\Support\Facades\DB::table('orders')->where('id', $o->id)->update(['created_at' => now()->toDateString().' 10:00:00', 'updated_at' => now()->toDateString().' 10:00:00']);
        $perf = $this->actingAs($this->admin)->getJson("/api/v1/staff/{$staff->id}/performance")->json('data');
        $report = $this->actingAs($this->admin)->getJson('/api/v1/reports/staff')->json('data.staff_performance');
        $found = collect($report)->firstWhere('staff_id', $staff->id);
        $this->assertNotNull($found);
        $this->assertEquals($perf['orders_handled'], $found['total_orders']);
        $this->assertEquals($perf['total_sales'], $found['total_sales']);
    }

    private function createUserWithRole(string $role): User
    {
        $u = User::factory()->create(['password' => Hash::make('secret-password')]);
        $u->roles()->attach(Role::firstOrCreate(['name' => $role], ['display_name' => ucfirst($role), 'module' => 'system']));
        return $u;
    }

    private function createStaffProfile(?User $user = null): StaffProfile
    {
        return StaffProfile::create([
            'user_id' => ($user ?? User::factory()->create())->id,
            'employee_id' => 'EMP-'.uniqid(),
            'position' => 'Server', 'department' => 'Service', 'employment_type' => 'full_time',
            'hire_date' => now()->toDateString(), 'is_active' => true,
        ]);
    }

    private function createOrder(string $userId, string $status, float $total): Order
    {
        return Order::create([
            'order_number' => 'ORD-'.uniqid(),
            'order_type' => 'dine_in',
            'status' => $status,
            'payment_status' => $status === 'completed' ? 'paid' : 'unpaid',
            'subtotal' => $total, 'total' => $total,
            'created_by' => $userId,
        ]);
    }
}
