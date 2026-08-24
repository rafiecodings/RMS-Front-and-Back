<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Role;
use App\Models\StaffProfile;
use App\Models\StaffShift;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffHardeningTest extends TestCase
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

    private function staffShift(): StaffShift
    {
        return StaffShift::create([
            'name' => 'Morning Shift',
            'start_time' => '06:00:00',
            'end_time' => '14:00:00',
        ]);
    }

    private function staffProfile(User $user, array $attributes = []): StaffProfile
    {
        return StaffProfile::create(array_merge([
            'user_id' => $user->id,
            'employee_id' => 'EMP-'.uniqid(),
            'position' => 'Waiter',
            'hire_date' => '2026-01-01',
            'is_active' => true,
        ], $attributes));
    }

    public function test_inactive_staff_cannot_be_scheduled(): void
    {
        $manager = $this->userWithRole('manager');
        $shift = $this->staffShift();
        $inactive = $this->staffProfile(User::factory()->create(), ['is_active' => false]);

        $this->actingAs($manager)->postJson('/api/v1/staff/schedule', [
            'staff_id' => $inactive->id,
            'shift_id' => $shift->id,
            'date' => '2026-03-01',
        ])->assertStatus(422);

        // Active staff can still be scheduled for the same date.
        $active = $this->staffProfile(User::factory()->create());

        $this->actingAs($manager)->postJson('/api/v1/staff/schedule', [
            'staff_id' => $active->id,
            'shift_id' => $shift->id,
            'date' => '2026-03-01',
        ])->assertStatus(201);
    }

    public function test_duplicate_schedule_for_same_staff_and_date_is_rejected(): void
    {
        $admin = $this->userWithRole('admin');
        $shift = $this->staffShift();
        $staff = $this->staffProfile(User::factory()->create());

        $payload = [
            'staff_id' => $staff->id,
            'shift_id' => $shift->id,
            'date' => '2026-03-02',
        ];

        $this->actingAs($admin)->postJson('/api/v1/staff/schedule', $payload)->assertStatus(201);
        $this->actingAs($admin)->postJson('/api/v1/staff/schedule', $payload)->assertStatus(409);
    }

    public function test_inactive_staff_cannot_clock_in(): void
    {
        $inactive = $this->staffProfile(User::factory()->create(), ['is_active' => false]);

        $this->actingAs(User::factory()->create())->postJson('/api/v1/staff/clock-in', [
            'staff_id' => $inactive->id,
        ])->assertStatus(403);
    }

    public function test_schedule_requires_manager_or_admin(): void
    {
        $cashier = $this->userWithRole('cashier');
        $shift = $this->staffShift();
        $staff = $this->staffProfile(User::factory()->create());

        $this->actingAs($cashier)->postJson('/api/v1/staff/schedule', [
            'staff_id' => $staff->id,
            'shift_id' => $shift->id,
            'date' => '2026-03-03',
        ])->assertStatus(403);
    }

    public function test_leave_request_requires_manager_or_admin(): void
    {
        $shift = $this->staffShift();
        $staff = $this->staffProfile(User::factory()->create());
        $payload = ['date' => '2026-03-04', 'reason' => 'Family emergency'];

        $waiter = $this->userWithRole('waiter');
        $this->actingAs($waiter)->postJson("/api/v1/staff/{$staff->id}/leave", $payload)
            ->assertStatus(403);

        $manager = $this->userWithRole('manager');
        $this->actingAs($manager)->postJson("/api/v1/staff/{$staff->id}/leave", $payload)
            ->assertStatus(200);
    }

    public function test_user_cannot_deactivate_own_profile(): void
    {
        $manager = $this->userWithRole('manager');
        $ownProfile = $this->staffProfile($manager);

        $this->actingAs($manager)->putJson("/api/v1/staff/{$ownProfile->id}", [
            'is_active' => false,
        ])->assertStatus(409);

        // Deactivating another profile is allowed.
        $other = $this->staffProfile(User::factory()->create());
        $this->actingAs($manager)->putJson("/api/v1/staff/{$other->id}", [
            'is_active' => false,
        ])->assertStatus(200);
    }

    public function test_attendance_endpoint_lists_records(): void
    {
        $staff = $this->staffProfile(User::factory()->create());

        Attendance::create([
            'staff_id' => $staff->id,
            'clock_in' => now()->setTime(8, 0),
            'clock_out' => now()->setTime(16, 0),
            'hours_worked' => 8,
            'status' => 'present',
        ]);

        $response = $this->actingAs(User::factory()->create())
            ->getJson('/api/v1/staff/attendance')
            ->assertStatus(200);

        $response->assertJsonPath('data.items.0.staff_id', $staff->id);
        $this->assertSame(8.0, (float) $response->json('data.items.0.total_hours'));
    }
}
