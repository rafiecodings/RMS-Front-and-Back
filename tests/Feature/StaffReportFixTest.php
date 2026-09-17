<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffReportFixTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $role): User
    {
        $u = User::factory()->create();
        $u->roles()->attach(Role::firstOrCreate(['name' => $role], ['display_name' => ucfirst($role), 'is_system' => true]));
        return $u;
    }

    public function test_admin_staff_report_200(): void
    {
        $admin = $this->userWithRole('admin');
        $this->actingAs($admin)->getJson('/api/v1/reports/staff?start_date=2026-09-01&end_date=2026-09-30')->assertStatus(200)->assertJsonPath('success', true);
    }

    public function test_manager_staff_report_200(): void
    {
        $manager = $this->userWithRole('manager');
        $this->actingAs($manager)->getJson('/api/v1/reports/staff?start_date=2026-09-01&end_date=2026-09-30')->assertStatus(200);
    }

    public function test_operational_403(): void
    {
        $waiter = $this->userWithRole('waiter');
        $this->actingAs($waiter)->getJson('/api/v1/reports/staff?start_date=2026-09-01&end_date=2026-09-30')->assertStatus(403);
    }

    public function test_empty_period_not_500(): void
    {
        $admin = $this->userWithRole('admin');
        $this->actingAs($admin)->getJson('/api/v1/reports/staff?start_date=2099-01-01&end_date=2099-01-31')->assertStatus(200)->assertJsonPath('data.performance_ranking', []);
    }
}
