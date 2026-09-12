<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\AuditLog;
use App\Models\Role;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffAttendanceTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(Role::firstOrCreate(['name' => $role], ['display_name' => $role]));
        return $user;
    }

    private function profile(?User $user = null, array $attributes = []): StaffProfile
    {
        return StaffProfile::create(array_merge([
            'user_id' => $user?->id,
            'employee_id' => 'EMP-'.fake()->unique()->numerify('#####'),
            'position' => 'Staff', 'hire_date' => '2026-01-01', 'is_active' => true,
        ], $attributes));
    }

    public function test_operational_roles_can_punch_only_their_own_profile_and_cannot_read_or_close_full_attendance(): void
    {
        $other = $this->profile();
        foreach (['waiter', 'cashier', 'kitchen_staff', 'inventory_staff'] as $role) {
            $user = $this->user($role);
            $staff = $this->profile($user);
            $this->actingAs($user)->getJson('/api/v1/staff/attendance')->assertForbidden();
            $this->postJson('/api/v1/staff/clock-in', ['staff_id' => $other->id])->assertForbidden();
            $this->postJson('/api/v1/staff/clock-out', ['staff_id' => $other->id])->assertForbidden();
            $id = $this->postJson('/api/v1/staff/clock-in', ['staff_id' => $staff->id])->assertCreated()->json('data.id');
            $this->postJson('/api/v1/staff/clock-in', ['staff_id' => $staff->id])->assertConflict();
            $this->getJson('/api/v1/staff/me?staff_id='.$other->id)->assertJsonPath('data.active_attendance.id', $id);
            $this->postJson("/api/v1/staff/attendance/{$id}/close", [])->assertForbidden();
            $this->travel(90)->minutes();
            $this->postJson('/api/v1/staff/clock-out', ['staff_id' => $staff->id])->assertOk()->assertJsonPath('data.hours_worked', 1.5);
            $this->getJson('/api/v1/staff/me')->assertJsonPath('data.active_attendance', null);
            $this->postJson('/api/v1/staff/clock-out', ['staff_id' => $staff->id])->assertNotFound();
        }
    }

    public function test_missing_profile_and_inactive_profile_are_safe_and_overnight_punch_can_close(): void
    {
        $user = $this->user('waiter');
        $other = $this->profile();
        $this->actingAs($user)->getJson('/api/v1/staff/me')->assertOk()->assertJsonPath('data', null);
        $this->postJson('/api/v1/staff/clock-in', ['staff_id' => $other->id])->assertForbidden();
        $staff = $this->profile($user, ['is_active' => false]);
        $this->postJson('/api/v1/staff/clock-in', ['staff_id' => $staff->id])->assertUnprocessable();
        $open = Attendance::create(['staff_id' => $staff->id, 'clock_in' => now()->subHours(30), 'status' => 'late']);
        $this->getJson('/api/v1/staff/me')->assertJsonPath('data.active_attendance.id', $open->id);
        $this->postJson('/api/v1/staff/clock-out', ['staff_id' => $staff->id])->assertOk();
        $this->assertEquals(30, $open->fresh()->hours_worked);
        $audit = AuditLog::where('action', 'clock_out')->firstOrFail();
        $this->assertStringContainsString($staff->employee_id, $audit->new_values['description']);
        $this->assertStringContainsString($user->name, $audit->new_values['description']);
        $this->assertSame($user->id, $audit->user_id);
    }

    public function test_admin_and_manager_search_is_case_insensitive_and_composes_with_filters(): void
    {
        $user = $this->user('waiter');
        $user->update(['name' => 'Alex Attendance', 'email' => 'alex.attendance@example.com']);
        $staff = $this->profile($user, ['employee_id' => 'EMP-SEARCH0']);
        $match = Attendance::create(['staff_id' => $staff->id, 'clock_in' => now(), 'status' => 'late', 'hours_worked' => 7.5]);
        Attendance::create(['staff_id' => $this->profile(null, ['employee_id' => 'UNLINKED'])->id, 'clock_in' => now(), 'status' => 'present']);
        foreach (['admin', 'manager'] as $role) {
            $this->actingAs($this->user($role));
            foreach (['ALEX ATTENDANCE', 'emp-search0', 'ALEX.ATTENDANCE@', '0'] as $term) {
                $this->getJson('/api/v1/staff/attendance?'.http_build_query(['search' => $term, 'status' => 'late', 'date' => now()->toDateString()]))
                    ->assertOk()->assertJsonPath('data.pagination.total', 1)
                    ->assertJsonPath('data.items.0.id', $match->id)->assertJsonPath('data.items.0.hours_worked', 7.5);
            }
            $this->getJson('/api/v1/staff/attendance?search=UNLINKED')->assertJsonPath('data.pagination.total', 1);
            $this->getJson('/api/v1/staff/attendance?search=alex&status=present')->assertJsonPath('data.pagination.total', 0);
            $this->getJson('/api/v1/staff/attendance?search=absent-name')->assertJsonPath('data.pagination.total', 0);
        }
    }

    public function test_privileged_stale_closure_validates_time_and_records_readable_audit(): void
    {
        foreach (['admin', 'manager'] as $role) {
            $actor = $this->user($role);
            $staff = $this->profile(null, ['is_active' => false]);
            $this->actingAs($actor)->postJson('/api/v1/staff/clock-in', ['staff_id' => $staff->id])->assertUnprocessable();
            $open = Attendance::create(['staff_id' => $staff->id, 'clock_in' => now()->subHours(48), 'status' => 'present']);
            $url = "/api/v1/staff/attendance/{$open->id}/close";
            $this->postJson($url, [])->assertUnprocessable();
            foreach ([now()->subHours(49), now()->addHour()] as $invalid) {
                $this->postJson($url, ['clock_out' => $invalid->toISOString(), 'reason' => 'Missed punch'])->assertUnprocessable();
            }
            $this->assertNull($open->fresh()->clock_out);
            $this->postJson($url, ['clock_out' => now()->subHours(40)->toISOString(), 'reason' => 'Missed punch'])
                ->assertOk()->assertJsonPath('data.hours_worked', 8);
            $this->postJson($url, ['clock_out' => now()->toISOString(), 'reason' => 'Duplicate'])->assertConflict();
            $audit = AuditLog::where('auditable_id', $open->id)->where('action', 'attendance_closed')->sole();
            $this->assertSame($actor->id, $audit->user_id);
            $this->assertStringContainsString($staff->employee_id, $audit->new_values['description']);
            $this->assertStringContainsString('Missed punch', $audit->new_values['description']);
            $recent = Attendance::create(['staff_id' => $staff->id, 'clock_in' => now()->subHour(), 'status' => 'present']);
            $this->postJson("/api/v1/staff/attendance/{$recent->id}/close", ['clock_out' => now()->toISOString(), 'reason' => 'Recent'])->assertUnprocessable();
        }
    }

    public function test_attendance_requires_authentication(): void
    {
        $this->getJson('/api/v1/staff/me')->assertUnauthorized();
        $this->getJson('/api/v1/staff/attendance')->assertUnauthorized();
        $this->postJson('/api/v1/staff/clock-in', [])->assertUnauthorized();
        $this->postJson('/api/v1/staff/clock-out', [])->assertUnauthorized();
        $this->postJson('/api/v1/staff/attendance/'.fake()->uuid().'/close', [])->assertUnauthorized();
    }
}
