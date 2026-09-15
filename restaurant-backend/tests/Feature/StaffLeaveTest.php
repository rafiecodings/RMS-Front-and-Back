<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\LeaveRequest;
use App\Models\Role;
use App\Models\ShiftSchedule;
use App\Models\StaffProfile;
use App\Models\StaffShift;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class StaffLeaveTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = $this->createUserWithRole('admin');
        $this->manager = $this->createUserWithRole('manager');
        $this->createShiftIfNeeded();
    }

    private function createShiftIfNeeded(): void
    {
        if (StaffShift::count() === 0) {
            StaffShift::create(['name' => 'Morning', 'start_time' => '06:00:00', 'end_time' => '14:00:00']);
        }
    }

    public function test_a_own_leave_request_allowed(): void
    {
        $waiter = $this->createUserWithRole('waiter');
        $own = $this->createStaffProfile(user: $waiter);
        $this->actingAs($waiter)->postJson("/api/v1/staff/{$own->id}/leave", [
            'leave_type' => 'sick', 'reason' => 'flu', 'start_date' => '2026-11-01', 'end_date' => '2026-11-02',
        ])->assertStatus(201)->assertJsonPath('data.status', 'requested')->assertJsonPath('data.leave_type', 'sick');
    }

    public function test_b_cross_staff_operational_forbidden(): void
    {
        $cashier = $this->createUserWithRole('cashier');
        $this->createStaffProfile(user: $cashier);
        $other = $this->createStaffProfile();
        $this->actingAs($cashier)->postJson("/api/v1/staff/{$other->id}/leave", [
            'leave_type' => 'vacation', 'reason' => 'x', 'start_date' => '2026-11-03', 'end_date' => '2026-11-03',
        ])->assertStatus(403);
    }

    public function test_c_admin_manager_override(): void
    {
        $target = $this->createStaffProfile();
        $this->actingAs($this->admin)->postJson("/api/v1/staff/{$target->id}/leave", [
            'leave_type' => 'emergency', 'reason' => 'admin creates', 'start_date' => '2026-11-04', 'end_date' => '2026-11-04',
        ])->assertStatus(201);
        $target2 = $this->createStaffProfile();
        $this->actingAs($this->manager)->postJson("/api/v1/staff/{$target2->id}/leave", [
            'leave_type' => 'other', 'reason' => 'mgr creates', 'start_date' => '2026-11-05', 'end_date' => '2026-11-05',
        ])->assertStatus(201);
    }

    public function test_d_inactive_staff_rejected(): void
    {
        $inactive = $this->createStaffProfile(isActive: false);
        $this->actingAs($this->admin)->postJson("/api/v1/staff/{$inactive->id}/leave", [
            'leave_type' => 'sick', 'reason' => 'x', 'start_date' => '2026-11-06', 'end_date' => '2026-11-06',
        ])->assertStatus(422);
    }

    public function test_e_invalid_date_range_rejected(): void
    {
        $p = $this->createStaffProfile();
        $this->actingAs($this->admin)->postJson("/api/v1/staff/{$p->id}/leave", [
            'leave_type' => 'sick', 'reason' => 'x', 'start_date' => '2026-11-10', 'end_date' => '2026-11-09',
        ])->assertStatus(422);
    }

    public function test_f_overlapping_rejected(): void
    {
        $p = $this->createStaffProfile();
        $this->actingAs($this->admin)->postJson("/api/v1/staff/{$p->id}/leave", [
            'leave_type' => 'vacation', 'reason' => 'first', 'start_date' => '2026-11-11', 'end_date' => '2026-11-13',
        ])->assertStatus(201);
        $this->actingAs($this->admin)->postJson("/api/v1/staff/{$p->id}/leave", [
            'leave_type' => 'sick', 'reason' => 'overlap', 'start_date' => '2026-11-12', 'end_date' => '2026-11-14',
        ])->assertStatus(409);
    }

    public function test_g_duplicate_rejected(): void
    {
        $p = $this->createStaffProfile();
        $payload = ['leave_type' => 'unpaid', 'reason' => 'dup', 'start_date' => '2026-11-15', 'end_date' => '2026-11-15'];
        $this->actingAs($this->admin)->postJson("/api/v1/staff/{$p->id}/leave", $payload)->assertStatus(201);
        $this->actingAs($this->admin)->postJson("/api/v1/staff/{$p->id}/leave", $payload)->assertStatus(409);
    }

    public function test_h_operational_list_own_only(): void
    {
        $waiter = $this->createUserWithRole('waiter');
        $own = $this->createStaffProfile(user: $waiter);
        $other = $this->createStaffProfile();
        $this->createLeave($own->id, '2026-11-16', '2026-11-16');
        $this->createLeave($other->id, '2026-11-16', '2026-11-16');
        $res = $this->actingAs($waiter)->getJson('/api/v1/staff/leave-requests');
        $res->assertStatus(200);
        foreach ($res->json('data.items') as $item) {
            $this->assertEquals($own->id, $item['staff_id']);
        }
    }

    public function test_i_admin_list_all(): void
    {
        $a = $this->createStaffProfile();
        $b = $this->createStaffProfile();
        $this->createLeave($a->id, '2026-11-17', '2026-11-17');
        $this->createLeave($b->id, '2026-11-18', '2026-11-18');
        $res = $this->actingAs($this->admin)->getJson('/api/v1/staff/leave-requests?per_page=100');
        $res->assertStatus(200);
        $this->assertGreaterThanOrEqual(2, $res->json('data.pagination.total'));
    }

    public function test_j_approve_requested(): void
    {
        $p = $this->createStaffProfile();
        $leaveId = $this->createLeave($p->id, '2026-11-19', '2026-11-19')->id;
        $this->actingAs($this->admin)->postJson("/api/v1/staff/leave-requests/{$leaveId}/approve", ['decision_notes' => 'ok'])
            ->assertStatus(200)->assertJsonPath('data.status', 'approved');
    }

    public function test_k_approval_changes_scheduled_confirmed_to_absent(): void
    {
        $p = $this->createStaffProfile();
        $shift = StaffShift::first();
        $sched = ShiftSchedule::create(['staff_id' => $p->id, 'shift_id' => $shift->id, 'date' => '2026-11-20', 'status' => 'scheduled']);
        $conf = ShiftSchedule::create(['staff_id' => $p->id, 'shift_id' => $shift->id, 'date' => '2026-11-21', 'status' => 'confirmed']);
        $leave = $this->createLeave($p->id, '2026-11-20', '2026-11-21');
        $this->actingAs($this->admin)->postJson("/api/v1/staff/leave-requests/{$leave->id}/approve")->assertStatus(200);
        $this->assertEquals('absent', $sched->fresh()->status);
        $this->assertEquals('absent', $conf->fresh()->status);
        $this->assertStringContainsString('approved', $sched->fresh()->notes);
    }

    public function test_l_approval_does_not_create_fake_shift(): void
    {
        $p = $this->createStaffProfile();
        $this->assertEquals(0, ShiftSchedule::where('staff_id', $p->id)->count());
        $leave = $this->createLeave($p->id, '2026-11-22', '2026-11-22');
        $this->actingAs($this->admin)->postJson("/api/v1/staff/leave-requests/{$leave->id}/approve")->assertStatus(200);
        $this->assertEquals(0, ShiftSchedule::where('staff_id', $p->id)->count());
    }

    public function test_m_completed_blocks_approval(): void
    {
        $p = $this->createStaffProfile();
        $shift = StaffShift::first();
        ShiftSchedule::create(['staff_id' => $p->id, 'shift_id' => $shift->id, 'date' => '2026-11-23', 'status' => 'completed']);
        $leave = $this->createLeave($p->id, '2026-11-23', '2026-11-23');
        $this->actingAs($this->admin)->postJson("/api/v1/staff/leave-requests/{$leave->id}/approve")->assertStatus(409);
        $this->assertEquals('requested', $leave->fresh()->status);
    }

    public function test_n_cancelled_preserved(): void
    {
        $p = $this->createStaffProfile();
        $shift = StaffShift::first();
        $cancelled = ShiftSchedule::create(['staff_id' => $p->id, 'shift_id' => $shift->id, 'date' => '2026-11-24', 'status' => 'cancelled']);
        $leave = $this->createLeave($p->id, '2026-11-24', '2026-11-24');
        $this->actingAs($this->admin)->postJson("/api/v1/staff/leave-requests/{$leave->id}/approve")->assertStatus(200);
        $this->assertEquals('cancelled', $cancelled->fresh()->status);
    }

    public function test_o_rejection_does_not_modify_schedules(): void
    {
        $p = $this->createStaffProfile();
        $shift = StaffShift::first();
        $s = ShiftSchedule::create(['staff_id' => $p->id, 'shift_id' => $shift->id, 'date' => '2026-11-25', 'status' => 'scheduled']);
        $leave = $this->createLeave($p->id, '2026-11-25', '2026-11-25');
        $this->actingAs($this->admin)->postJson("/api/v1/staff/leave-requests/{$leave->id}/reject")->assertStatus(200);
        $this->assertEquals('scheduled', $s->fresh()->status);
    }

    public function test_p_own_requested_cancellation(): void
    {
        $waiter = $this->createUserWithRole('waiter');
        $own = $this->createStaffProfile(user: $waiter);
        $leave = $this->createLeave($own->id, '2026-11-26', '2026-11-26');
        $this->actingAs($waiter)->postJson("/api/v1/staff/leave-requests/{$leave->id}/cancel")->assertStatus(200)->assertJsonPath('data.status', 'cancelled');
    }

    public function test_q_cannot_self_cancel_approved(): void
    {
        $waiter = $this->createUserWithRole('waiter');
        $own = $this->createStaffProfile(user: $waiter);
        $leave = $this->createLeave($own->id, '2026-11-27', '2026-11-27');
        $this->actingAs($this->admin)->postJson("/api/v1/staff/leave-requests/{$leave->id}/approve")->assertStatus(200);
        $this->actingAs($waiter)->postJson("/api/v1/staff/leave-requests/{$leave->id}/cancel")->assertStatus(422);
    }

    public function test_r_unauthorized_approve_reject_forbidden(): void
    {
        $waiter = $this->createUserWithRole('waiter');
        $this->createStaffProfile(user: $waiter);
        $target = $this->createStaffProfile();
        $leave = $this->createLeave($target->id, '2026-11-28', '2026-11-28');
        $this->actingAs($waiter)->postJson("/api/v1/staff/leave-requests/{$leave->id}/approve")->assertStatus(403);
        $this->actingAs($waiter)->postJson("/api/v1/staff/leave-requests/{$leave->id}/reject")->assertStatus(403);
    }

    public function test_s_malformed_uuid_safe(): void
    {
        $this->actingAs($this->admin)->postJson('/api/v1/staff/leave-requests/not-a-uuid/approve')->assertStatus(404);
        $this->actingAs($this->admin)->postJson('/api/v1/staff/leave-requests/not-a-uuid/reject')->assertStatus(404);
        $this->actingAs($this->admin)->postJson('/api/v1/staff/leave-requests/not-a-uuid/cancel')->assertStatus(404);
        $this->actingAs($this->admin)->postJson('/api/v1/staff/not-a-uuid/leave', ['leave_type' => 'sick', 'reason' => 'x', 'start_date' => '2026-11-29', 'end_date' => '2026-11-29'])->assertStatus(404);
    }

    public function test_t_audit_actor_and_readable(): void
    {
        $p = $this->createStaffProfile();
        $leaveId = $this->actingAs($this->admin)->postJson("/api/v1/staff/{$p->id}/leave", [
            'leave_type' => 'vacation', 'reason' => 'trip', 'start_date' => '2026-12-01', 'end_date' => '2026-12-02',
        ])->assertStatus(201)->json('data.id');

        $reqLog = AuditLog::where('action', 'leave_requested')->latest()->first();
        $this->assertNotNull($reqLog);
        $this->assertEquals($this->admin->id, $reqLog->user_id);
        $this->assertStringContainsString($p->employee_id, $reqLog->new_values['description']);

        $this->actingAs($this->manager)->postJson("/api/v1/staff/leave-requests/{$leaveId}/approve", ['decision_notes' => 'ok'])->assertStatus(200);
        $appLog = AuditLog::where('action', 'leave_approved')->latest()->first();
        $this->assertEquals($this->manager->id, $appLog->user_id);
        $this->assertStringContainsString($p->employee_id, $appLog->new_values['description']);

        $p2 = $this->createStaffProfile();
        $leave2 = $this->createLeave($p2->id, '2026-12-03', '2026-12-03');
        $this->actingAs($this->admin)->postJson("/api/v1/staff/leave-requests/{$leave2->id}/reject")->assertStatus(200);
        $this->assertNotNull(AuditLog::where('action', 'leave_rejected')->latest()->first());

        $waiter = $this->createUserWithRole('waiter');
        $own = $this->createStaffProfile(user: $waiter);
        $leave3 = $this->createLeave($own->id, '2026-12-04', '2026-12-04');
        $this->actingAs($waiter)->postJson("/api/v1/staff/leave-requests/{$leave3->id}/cancel")->assertStatus(200);
        $this->assertNotNull(AuditLog::where('action', 'leave_cancelled')->latest()->first());
    }

    public function test_u_multi_day_atomic(): void
    {
        $p = $this->createStaffProfile();
        $shift = StaffShift::first();
        $a = ShiftSchedule::create(['staff_id' => $p->id, 'shift_id' => $shift->id, 'date' => '2026-12-05', 'status' => 'scheduled']);
        ShiftSchedule::create(['staff_id' => $p->id, 'shift_id' => $shift->id, 'date' => '2026-12-06', 'status' => 'completed']);
        $leave = $this->createLeave($p->id, '2026-12-05', '2026-12-06');
        $this->actingAs($this->admin)->postJson("/api/v1/staff/leave-requests/{$leave->id}/approve")->assertStatus(409);
        $this->assertEquals('requested', $leave->fresh()->status);
        $this->assertEquals('scheduled', $a->fresh()->status);
    }

    private function createUserWithRole(string $role): User
    {
        $u = User::factory()->create(['password' => Hash::make('secret-password')]);
        $u->roles()->attach(Role::firstOrCreate(['name' => $role], ['display_name' => ucfirst($role), 'module' => 'system']));
        return $u;
    }

    private function createStaffProfile(?User $user = null, bool $isActive = true): StaffProfile
    {
        return StaffProfile::create([
            'user_id' => ($user ?? User::factory()->create())->id,
            'employee_id' => 'EMP-'.uniqid(),
            'position' => 'Server', 'department' => 'Service', 'employment_type' => 'full_time',
            'hire_date' => now()->toDateString(), 'is_active' => $isActive,
        ]);
    }

    private function createLeave(string $staffId, string $start, string $end, string $type = 'sick'): LeaveRequest
    {
        return LeaveRequest::create([
            'staff_id' => $staffId, 'leave_type' => $type, 'reason' => 'test reason',
            'start_date' => $start, 'end_date' => $end, 'status' => 'requested', 'requested_at' => now(),
        ]);
    }
}
