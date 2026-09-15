<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\ShiftSchedule;
use App\Models\StaffProfile;
use App\Models\StaffShift;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Staff shift scheduling workflow: response contract, business rules,
 * UUID routing, leave ownership RBAC, and audit coverage.
 */
class StaffScheduleTest extends TestCase
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

    public function test_create_valid_schedule(): void
    {
        $profile = $this->createStaffProfile();
        $shift = $this->createShift();

        $response = $this->actingAs($this->admin)->postJson('/api/v1/staff/schedule', [
            'staff_id' => $profile->id,
            'shift_id' => $shift->id,
            'date' => '2026-10-05',
            'notes' => 'opening cover',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.staff_id', $profile->id)
            ->assertJsonPath('data.shift_id', $shift->id)
            ->assertJsonPath('data.date', '2026-10-05')
            ->assertJsonPath('data.notes', 'opening cover');

        $this->assertNotNull($response->json('data.updated_at'));
    }

    public function test_duplicate_schedule_rejected(): void
    {
        $profile = $this->createStaffProfile();
        $a = $this->createShift('Morning');
        $b = $this->createShift('Evening');

        $this->actingAs($this->admin)->postJson('/api/v1/staff/schedule', [
            'staff_id' => $profile->id,
            'shift_id' => $a->id,
            'date' => '2026-10-06',
        ])->assertStatus(201);

        // Same staff, same date, different shift template: still a duplicate.
        $this->actingAs($this->admin)->postJson('/api/v1/staff/schedule', [
            'staff_id' => $profile->id,
            'shift_id' => $b->id,
            'date' => '2026-10-06',
        ])->assertStatus(409);
    }

    public function test_overlapping_schedule_rejected_on_update(): void
    {
        $profile = $this->createStaffProfile();
        $a = $this->createSchedule($profile->id, '2026-10-07');
        $b = $this->createSchedule($profile->id, '2026-10-08');

        $this->actingAs($this->admin)
            ->putJson("/api/v1/staff/schedule/{$b->id}", ['date' => '2026-10-07'])
            ->assertStatus(409);

        $this->assertEquals('2026-10-08', $b->fresh()->date->toDateString());
    }

    public function test_inactive_staff_rejected(): void
    {
        $profile = $this->createStaffProfile(isActive: false);
        $shift = $this->createShift();

        $this->actingAs($this->admin)->postJson('/api/v1/staff/schedule', [
            'staff_id' => $profile->id,
            'shift_id' => $shift->id,
            'date' => '2026-10-09',
        ])->assertStatus(422);

        $schedule = $this->createSchedule($this->createStaffProfile()->id, '2026-10-10');

        $this->actingAs($this->admin)
            ->putJson("/api/v1/staff/schedule/{$schedule->id}", ['staff_id' => $profile->id])
            ->assertStatus(422);
    }

    public function test_soft_deleted_shift_rejected(): void
    {
        $profile = $this->createStaffProfile();
        $shift = $this->createShift();
        $shift->delete();

        $this->actingAs($this->admin)->postJson('/api/v1/staff/schedule', [
            'staff_id' => $profile->id,
            'shift_id' => $shift->id,
            'date' => '2026-10-11',
        ])->assertStatus(422);

        $this->assertFalse(
            $this->actingAs($this->admin)->getJson('/api/v1/staff/shifts')->json('data.*.id') !== null
            && in_array($shift->id, $this->actingAs($this->admin)->getJson('/api/v1/staff/shifts')->json('data.*.id'))
        );
    }

    public function test_update_schedule_works(): void
    {
        $schedule = $this->createSchedule();

        $this->actingAs($this->admin)
            ->putJson("/api/v1/staff/schedule/{$schedule->id}", [
                'status' => 'confirmed',
                'notes' => 'rescheduled cover',
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'confirmed')
            ->assertJsonPath('data.notes', 'rescheduled cover')
            ->assertJsonPath('data.staff_id', $schedule->staff_id)
            ->assertJsonPath('data.shift_id', $schedule->shift_id);
    }

    public function test_conflicting_update_rejected(): void
    {
        $profile = $this->createStaffProfile();
        $a = $this->createSchedule($profile->id, '2026-10-12');
        $b = $this->createSchedule($profile->id, '2026-10-13');

        $this->actingAs($this->admin)
            ->putJson("/api/v1/staff/schedule/{$b->id}", ['date' => '2026-10-12'])
            ->assertStatus(409);

        $this->assertEquals('2026-10-13', $b->fresh()->date->toDateString());
        $this->assertTrue($a->fresh() !== null);
    }

    public function test_delete_soft_deletes(): void
    {
        $schedule = $this->createSchedule();

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/staff/schedule/{$schedule->id}")
            ->assertStatus(200);

        $this->assertSoftDeleted((new ShiftSchedule)->getTable(), ['id' => $schedule->id]);
    }

    public function test_malformed_uuid_rejected_safely(): void
    {
        $this->actingAs($this->admin)
            ->putJson('/api/v1/staff/schedule/not-a-uuid', ['status' => 'confirmed'])
            ->assertStatus(404);

        $this->actingAs($this->admin)
            ->deleteJson('/api/v1/staff/schedule/not-a-uuid')
            ->assertStatus(404);
    }

    public function test_operational_role_sees_only_own_schedule(): void
    {
        $waiter = $this->createUserWithRole('waiter');
        $own = $this->createStaffProfile(user: $waiter);
        $other = $this->createStaffProfile();
        $this->createSchedule($own->id, '2026-10-14');
        $this->createSchedule($other->id, '2026-10-14');

        $response = $this->actingAs($waiter)->getJson('/api/v1/staff/schedule');
        $response->assertStatus(200);

        $items = $response->json('data.items');
        $this->assertNotEmpty($items);
        foreach ($items as $item) {
            $this->assertEquals($own->id, $item['staff_id']);
        }

        // Cross-staff filter attempt is forbidden.
        $this->actingAs($waiter)
            ->getJson("/api/v1/staff/schedule?staff_id={$other->id}")
            ->assertStatus(403);
    }

    public function test_own_leave_allowed(): void
    {
        $waiter = $this->createUserWithRole('waiter');
        $own = $this->createStaffProfile(user: $waiter);
        $this->createShift();

        $this->actingAs($waiter)
            ->postJson("/api/v1/staff/{$own->id}/leave", [
                'leave_type' => 'sick',
                'reason' => 'family matter',
                'start_date' => '2026-10-15',
                'end_date' => '2026-10-15',
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.status', 'requested');
    }

    public function test_cross_staff_leave_forbidden_for_operational_role(): void
    {
        $waiter = $this->createUserWithRole('waiter');
        $this->createStaffProfile(user: $waiter);
        $other = $this->createStaffProfile();

        $this->actingAs($waiter)
            ->postJson("/api/v1/staff/{$other->id}/leave", [
                'leave_type' => 'vacation',
                'reason' => 'not my leave',
                'start_date' => '2026-10-16',
                'end_date' => '2026-10-16',
            ])
            ->assertStatus(403);
    }

    public function test_admin_manager_leave_override_works(): void
    {
        $this->createShift();
        $other = $this->createStaffProfile();

        $this->actingAs($this->admin)
            ->postJson("/api/v1/staff/{$other->id}/leave", [
                'leave_type' => 'emergency',
                'reason' => 'approved by admin',
                'start_date' => '2026-10-17',
                'end_date' => '2026-10-17',
            ])
            ->assertStatus(201);

        $another = $this->createStaffProfile();

        $this->actingAs($this->manager)
            ->postJson("/api/v1/staff/{$another->id}/leave", [
                'leave_type' => 'other',
                'reason' => 'approved by manager',
                'start_date' => '2026-10-18',
                'end_date' => '2026-10-18',
            ])
            ->assertStatus(201);
    }

    public function test_schedule_payload_contract(): void
    {
        $schedule = $this->createSchedule();

        $list = $this->actingAs($this->admin)->getJson('/api/v1/staff/schedule');
        $list->assertStatus(200);
        $item = collect($list->json('data.items'))->firstWhere('id', $schedule->id);
        $this->assertNotNull($item);
        foreach (['id', 'staff_id', 'shift_id', 'date', 'status', 'notes', 'staff', 'shift', 'created_at', 'updated_at'] as $key) {
            $this->assertArrayHasKey($key, $item, "GET item missing key: {$key}");
        }
    }

    public function test_audit_actor_and_readable_descriptions(): void
    {
        $profile = $this->createStaffProfile();
        $shift = $this->createShift();

        $scheduleId = $this->actingAs($this->admin)->postJson('/api/v1/staff/schedule', [
            'staff_id' => $profile->id,
            'shift_id' => $shift->id,
            'date' => '2026-10-19',
        ])->assertStatus(201)->json('data.id');

        $created = AuditLog::where('action', 'shift_scheduled')->latest()->first();
        $this->assertNotNull($created);
        $this->assertEquals($this->admin->id, $created->user_id);
        $this->assertStringContainsString($profile->employee_id, $created->new_values['description'] ?? '');
        $this->assertDoesNotMatchRegularExpression(
            '/^[0-9a-f-]{36}$/i',
            trim((string) ($created->new_values['description'] ?? '')),
            'Audit description must not be UUID-only.'
        );

        $this->actingAs($this->manager)
            ->putJson("/api/v1/staff/schedule/{$scheduleId}", ['status' => 'confirmed'])
            ->assertStatus(200);

        $updated = AuditLog::where('action', 'shift_schedule_updated')->latest()->first();
        $this->assertNotNull($updated);
        $this->assertEquals($this->manager->id, $updated->user_id);
        $this->assertStringContainsString($profile->employee_id, $updated->new_values['description'] ?? '');

        $this->actingAs($this->admin)->deleteJson("/api/v1/staff/schedule/{$scheduleId}")->assertStatus(200);

        $deleted = AuditLog::where('action', 'shift_schedule_deleted')->latest()->first();
        $this->assertNotNull($deleted);
        $this->assertEquals($this->admin->id, $deleted->user_id);
        $this->assertStringContainsString($profile->employee_id, $deleted->new_values['description'] ?? '');

        // One event per transition, no duplicates.
        $this->assertEquals(1, AuditLog::where('action', 'shift_scheduled')->where('auditable_id', $scheduleId)->count());
        $this->assertEquals(1, AuditLog::where('action', 'shift_schedule_updated')->where('auditable_id', $scheduleId)->count());
        $this->assertEquals(1, AuditLog::where('action', 'shift_schedule_deleted')->where('auditable_id', $scheduleId)->count());
    }

    public function test_night_shift_crossing_midnight_stays_valid(): void
    {
        $profile = $this->createStaffProfile();
        $night = StaffShift::create(['name' => 'Night '.uniqid(), 'start_time' => '22:00:00', 'end_time' => '06:00:00']);

        $this->actingAs($this->admin)->postJson('/api/v1/staff/schedule', [
            'staff_id' => $profile->id,
            'shift_id' => $night->id,
            'date' => '2026-10-20',
        ])->assertStatus(201);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private function createUserWithRole(string $role): User
    {
        $user = User::factory()->create([
            'password' => Hash::make('secret-password'),
        ]);
        $user->roles()->attach(
            Role::firstOrCreate(
                ['name' => $role],
                ['display_name' => ucfirst($role), 'module' => 'system']
            )
        );

        return $user;
    }

    private function createStaffProfile(?User $user = null, bool $isActive = true): StaffProfile
    {
        return StaffProfile::create([
            'user_id' => ($user ?? User::factory()->create())->id,
            'employee_id' => 'EMP-'.uniqid(),
            'position' => 'Server',
            'department' => 'Service',
            'employment_type' => 'full_time',
            'hire_date' => now()->toDateString(),
            'is_active' => $isActive,
        ]);
    }

    private function createShift(string $name = 'Morning'): StaffShift
    {
        return StaffShift::create([
            'name' => $name.' '.uniqid(),
            'start_time' => '06:00:00',
            'end_time' => '14:00:00',
        ]);
    }

    private function createSchedule(?string $staffId = null, string $date = '2026-10-21'): ShiftSchedule
    {
        $profile = $staffId ? StaffProfile::find($staffId) : $this->createStaffProfile();

        return ShiftSchedule::create([
            'staff_id' => $profile->id,
            'shift_id' => $this->createShift()->id,
            'date' => $date,
            'status' => 'scheduled',
        ]);
    }
}
