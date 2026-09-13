<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Staff;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\StaffCommission;
use App\Models\StaffPerformance;
use App\Models\StaffProfile;
use App\Models\StaffShift;
use App\Models\ShiftSchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StaffController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = StaffProfile::with('user');

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($department = $request->input('department')) {
            $query->where('department', $department);
        }

        if ($position = $request->input('position')) {
            $query->where('position', $position);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(employee_id) LIKE ?', ["%".strtolower($search)."%"])
                    ->orWhereRaw('LOWER(position) LIKE ?', ["%".strtolower($search)."%"])
                    ->orWhereHas('user', fn ($uq) => $uq->whereRaw('LOWER(name) LIKE ?', ["%".strtolower($search)."%"]));
            });
        }

        $staff = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $staff->getCollection()->map(fn (StaffProfile $s) => [
            'id' => $s->id,
            'employee_id' => $s->employee_id,
            'position' => $s->position,
            'department' => $s->department,
            'hourly_rate' => (float) $s->hourly_rate,
            'base_salary' => (float) $s->base_salary,
            'hire_date' => $s->hire_date?->toDateString(),
            'employment_type' => $s->employment_type,
            'phone' => $s->phone,
            'is_active' => $s->is_active,
            'user' => $s->user ? [
                'id' => $s->user->id,
                'name' => $s->user->name,
                'email' => $s->user->email,
                'role' => $s->user->roles->first()?->name ?? 'user',
            ] : null,
            'created_at' => $s->created_at?->toISOString(),
            'updated_at' => $s->updated_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $staff->currentPage(),
                'last_page' => $staff->lastPage(),
                'per_page' => $staff->perPage(),
                'total' => $staff->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'nullable|uuid|exists:users,id|unique:staff_profiles,user_id',
            'employee_id' => 'required|string|max:50|unique:staff_profiles,employee_id',
            'position' => 'required|string|max:255',
            'department' => 'nullable|string|max:255',
            'hourly_rate' => 'nullable|numeric|min:0',
            'base_salary' => 'nullable|numeric|min:0',
            'hire_date' => 'required|date',
            'end_date' => 'nullable|date|after:hire_date',
            'employment_type' => 'sometimes|string|in:full_time,part_time,contract,intern',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:1000',
            'is_active' => 'sometimes|boolean',
        ]);

        $staff = StaffProfile::create($validated);

        $staff->load('user');

        \App\Services\AuditLogger::record('staff_created', $staff, [
            'description' => "Staff profile {$staff->employee_id} created"
                .($staff->user ? " for {$staff->user->name}" : ''),
            'position' => $staff->position,
        ]);

        return $this->created([
            'id' => $staff->id,
            'employee_id' => $staff->employee_id,
            'position' => $staff->position,
            'department' => $staff->department,
            'hourly_rate' => (float) $staff->hourly_rate,
            'base_salary' => (float) $staff->base_salary,
            'hire_date' => $staff->hire_date?->toDateString(),
            'employment_type' => $staff->employment_type,
            'phone' => $staff->phone,
            'address' => $staff->address,
            'is_active' => $staff->is_active,
            'user' => $staff->user ? [
                'id' => $staff->user->id,
                'name' => $staff->user->name,
                'email' => $staff->user->email,
            ] : null,
            'created_at' => $staff->created_at?->toISOString(),
            'updated_at' => $staff->updated_at?->toISOString(),
        ], 'Staff profile created successfully.');
    }

    public function show(string $id): JsonResponse
    {
        $staff = StaffProfile::with('user')->find($id);

        if (!$staff) {
            return $this->notFound('Staff profile not found.');
        }

        return $this->success([
            'id' => $staff->id,
            'employee_id' => $staff->employee_id,
            'position' => $staff->position,
            'department' => $staff->department,
            'hourly_rate' => (float) $staff->hourly_rate,
            'base_salary' => (float) $staff->base_salary,
            'hire_date' => $staff->hire_date?->toDateString(),
            'end_date' => $staff->end_date?->toDateString(),
            'employment_type' => $staff->employment_type,
            'phone' => $staff->phone,
            'address' => $staff->address,
            'is_active' => $staff->is_active,
            'user' => $staff->user ? [
                'id' => $staff->user->id,
                'name' => $staff->user->name,
                'email' => $staff->user->email,
                'role' => $staff->user->roles->first()?->name ?? 'user',
            ] : null,
            'created_at' => $staff->created_at?->toISOString(),
            'updated_at' => $staff->updated_at?->toISOString(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $staff = StaffProfile::find($id);

        if (!$staff) {
            return $this->notFound('Staff profile not found.');
        }

        $validated = $request->validate([
            'position' => 'sometimes|string|max:255',
            'department' => 'nullable|string|max:255',
            'hourly_rate' => 'sometimes|numeric|min:0',
            'base_salary' => 'sometimes|numeric|min:0',
            'end_date' => 'nullable|date',
            'employment_type' => 'sometimes|string|in:full_time,part_time,contract,intern',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:1000',
            'is_active' => 'sometimes|boolean',
        ]);

        $staff->update($validated);

        \App\Services\AuditLogger::record('staff_updated', $staff, [
            'description' => "Staff profile {$staff->employee_id} updated",
        ]);

        return $this->success([
            'id' => $staff->id,
            'employee_id' => $staff->employee_id,
            'position' => $staff->position,
            'department' => $staff->department,
            'hourly_rate' => (float) $staff->hourly_rate,
            'base_salary' => (float) $staff->base_salary,
            'hire_date' => $staff->hire_date?->toDateString(),
            'employment_type' => $staff->employment_type,
            'phone' => $staff->phone,
            'is_active' => $staff->is_active,
            'updated_at' => $staff->updated_at?->toISOString(),
        ], 'Staff profile updated successfully.');
    }

    public function me(Request $request): JsonResponse
    {
        $staff = StaffProfile::with('user')->where('user_id', $request->user()->id)->first();

        if (!$staff) {
            return $this->success(null, 'No staff profile found for current user.');
        }

        // Do not limit this to today: an overnight or missed punch remains open.
        $activeAttendance = Attendance::where('staff_id', $staff->id)
            ->whereNull('clock_out')->orderBy('clock_in')->first();

        return $this->success([
            'active_attendance' => $activeAttendance ? [
                'id' => $activeAttendance->id,
                'clock_in' => $activeAttendance->clock_in?->toISOString(),
            ] : null,
            'id' => $staff->id,
            'employee_id' => $staff->employee_id,
            'position' => $staff->position,
            'department' => $staff->department,
            'hourly_rate' => (float) $staff->hourly_rate,
            'base_salary' => (float) $staff->base_salary,
            'hire_date' => $staff->hire_date?->toDateString(),
            'employment_type' => $staff->employment_type,
            'phone' => $staff->phone,
            'address' => $staff->address,
            'is_active' => $staff->is_active,
            'user_id' => $staff->user_id,
            'user' => $staff->user ? [
                'id' => $staff->user->id,
                'name' => $staff->user->name,
                'email' => $staff->user->email,
            ] : null,
            'created_at' => $staff->created_at?->toISOString(),
            'updated_at' => $staff->updated_at?->toISOString(),
        ]);
    }

    public function performance(Request $request, string $id): JsonResponse
    {
        $staff = StaffProfile::find($id);

        if (!$staff) {
            return $this->notFound('Staff profile not found.');
        }

        $performances = StaffPerformance::where('staff_id', $id);

        // Operational performance only — attendance/punctuality belong to HRMS.
        $summary = [
            'orders_handled' => (int) $performances->sum('orders_served'),
            'tables_served' => (int) $performances->sum('tables_served'),
            'total_sales' => (float) $performances->sum('total_sales'),
            'tips_earned' => (float) $performances->sum('tips_earned'),
            'average_rating' => round((float) $performances->avg('rating'), 2),
            'customer_feedback_count' => (int) $performances->sum('customer_feedback_count'),
        ];

        return $this->success($summary);
    }

    public function clockIn(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'staff_id' => 'required|uuid|exists:staff_profiles,id',
        ]);

        if (! $request->user()->hasRole('admin') && ! $request->user()->hasRole('manager')) {
            $ownProfile = StaffProfile::where('user_id', $request->user()->id)->first();
            if (! $ownProfile || $ownProfile->id !== $validated['staff_id']) {
                return $this->error('You may only clock in for your own staff profile.', 403);
            }
        }

        $target = StaffProfile::with('user')->find($validated['staff_id']);

        // Inactive staff cannot start new attendance.
        if ($target && !$target->is_active) {
            return $this->error('This staff profile is inactive and cannot clock in.', 422);
        }

        $existingClockIn = Attendance::where('staff_id', $validated['staff_id'])
            ->whereNull('clock_out')
            ->first();

        if ($existingClockIn) {
            return $this->error('Staff is already clocked in.', 409);
        }

        $attendance = Attendance::create([
            'staff_id' => $validated['staff_id'],
            'clock_in' => now(),
            'status' => 'present',
        ]);

        \App\Services\AuditLogger::record('clock_in', $attendance, [
            'description' => 'Clock in recorded for '
                .($target?->employee_id ?? $validated['staff_id'])
                .($target?->user?->name ? " — {$target->user->name}" : ''),
        ]);

        return $this->created([
            'id' => $attendance->id,
            'staff_id' => $attendance->staff_id,
            'clock_in' => $attendance->clock_in?->toISOString(),
            'status' => $attendance->status,
        ], 'Clock in recorded successfully.');
    }

    public function clockOut(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'staff_id' => 'required|uuid|exists:staff_profiles,id',
        ]);

        if (! $request->user()->hasRole('admin') && ! $request->user()->hasRole('manager')) {
            $ownProfile = StaffProfile::where('user_id', $request->user()->id)->first();
            if (! $ownProfile || $ownProfile->id !== $validated['staff_id']) {
                return $this->error('You may only clock out for your own staff profile.', 403);
            }
        }

        $attendance = Attendance::where('staff_id', $validated['staff_id'])
            ->whereNull('clock_out')
            ->first();

        if (!$attendance) {
            return $this->error('No active clock-in found for this staff.', 404);
        }

        // Closing an open record is always allowed (even for inactive
        // staff) so punches never get stuck; starting new ones is blocked.
        $clockOut = now();
        $hoursWorked = $attendance->clock_in->diffInMinutes($clockOut) / 60;

        $attendance->update([
            'clock_out' => $clockOut,
            'hours_worked' => round($hoursWorked, 2),
        ]);

        $target = StaffProfile::with('user')->find($validated['staff_id']);

        \App\Services\AuditLogger::record('clock_out', $attendance, [
            'description' => 'Clock out recorded for '
                .($target?->employee_id ?? $validated['staff_id'])
                .($target?->user?->name ? " — {$target->user->name}" : ''),
        ]);

        return $this->success([
            'id' => $attendance->id,
            'staff_id' => $attendance->staff_id,
            'clock_in' => $attendance->clock_in?->toISOString(),
            'clock_out' => $attendance->clock_out?->toISOString(),
            'hours_worked' => (float) $attendance->hours_worked,
        ], 'Clock out recorded successfully.');
    }

    /** Correct an open punch older than 24 hours using its actual end time. */
    public function closeAttendance(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'clock_out' => 'required|date|before_or_equal:now',
            'reason' => 'required|string|max:500',
        ]);

        return DB::transaction(function () use ($id, $validated) {
            $attendance = Attendance::with('staff.user')->lockForUpdate()->find($id);
            if (!$attendance) {
                return $this->notFound('Attendance record not found.');
            }
            if ($attendance->clock_out !== null) {
                return $this->error('Attendance record is already closed.', 409);
            }
            if ($attendance->clock_in->greaterThan(now()->subHours(24))) {
                return $this->error('Only attendance open for at least 24 hours may be corrected.', 422);
            }
            $clockOut = \Illuminate\Support\Carbon::parse($validated['clock_out']);
            if ($clockOut->lessThan($attendance->clock_in)) {
                return $this->error('Clock out must be on or after clock in.', 422);
            }
            $attendance->update([
                'clock_out' => $clockOut,
                'hours_worked' => round($attendance->clock_in->diffInMinutes($clockOut) / 60, 2),
            ]);
            $staff = $attendance->staff;
            \App\Services\AuditLogger::record('attendance_closed', $attendance, [
                'description' => 'Stale attendance closed for '.($staff?->employee_id ?? 'deleted staff')
                    .($staff?->user?->name ? " — {$staff->user->name}" : '')
                    .': '.$validated['reason'],
                'reason' => $validated['reason'],
                'clock_out' => $clockOut->toISOString(),
                'hours_worked' => (float) $attendance->hours_worked,
            ], oldValues: ['clock_out' => null]);

            return $this->success([
                'id' => $attendance->id,
                'staff_id' => $attendance->staff_id,
                'clock_out' => $attendance->clock_out->toISOString(),
                'hours_worked' => (float) $attendance->hours_worked,
            ], 'Stale attendance closed successfully.');
        });
    }

    /**
     * Canonical schedule payload. All schedule endpoints (list / create /
     * update) share this shape so the week grid can key on staff_id.
     */
    private function formatSchedule(ShiftSchedule $s): array
    {
        return [
            'id' => $s->id,
            'staff_id' => $s->staff_id,
            'shift_id' => $s->shift_id,
            'date' => $s->date?->toDateString(),
            'status' => $s->status,
            'notes' => $s->notes,
            'staff' => $s->staff ? [
                'id' => $s->staff->id,
                'employee_id' => $s->staff->employee_id,
                'name' => $s->staff->user?->name,
            ] : null,
            'shift' => $s->shift ? [
                'id' => $s->shift->id,
                'name' => $s->shift->name,
                'start_time' => $s->shift->start_time,
                'end_time' => $s->shift->end_time,
            ] : null,
            'created_at' => $s->created_at?->toISOString(),
            'updated_at' => $s->updated_at?->toISOString(),
        ];
    }

    public function schedule(Request $request): JsonResponse
    {
        $request->validate([
            'date' => 'nullable|date',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'staff_id' => 'nullable|uuid',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $isPrivileged = $request->user()->hasRole('admin') || $request->user()->hasRole('manager');

        // Operational roles are scoped to their own linked staff profile so
        // one employee can never enumerate the whole roster through this
        // endpoint. Admin/manager keep the full view.
        if (!$isPrivileged) {
            $ownProfile = StaffProfile::where('user_id', $request->user()->id)->first();
            if (!$ownProfile) {
                return $this->success([
                    'items' => [],
                    'pagination' => [
                        'current_page' => 1,
                        'last_page' => 1,
                        'per_page' => $request->integer('per_page', 15),
                        'total' => 0,
                    ],
                ]);
            }
            if ($request->filled('staff_id') && $request->input('staff_id') !== $ownProfile->id) {
                return $this->error('You may only view your own schedule.', 403);
            }
        }

        $query = ShiftSchedule::with(['staff.user', 'shift']);

        if ($date = $request->input('date')) {
            $query->whereDate('date', $date);
        }

        if ($startDate = $request->input('start_date')) {
            $query->whereDate('date', '>=', $startDate);
        }

        if ($endDate = $request->input('end_date')) {
            $query->whereDate('date', '<=', $endDate);
        }

        if (!$isPrivileged) {
            $query->where('staff_id', $ownProfile->id);
        } elseif ($staffId = $request->input('staff_id')) {
            $query->where('staff_id', $staffId);
        }

        $schedules = $query->orderBy('date')
            ->paginate($request->integer('per_page', 15));

        $data = $schedules->getCollection()->map(fn (ShiftSchedule $s) => $this->formatSchedule($s));

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $schedules->currentPage(),
                'last_page' => $schedules->lastPage(),
                'per_page' => $schedules->perPage(),
                'total' => $schedules->total(),
            ],
        ]);
    }

    public function shifts(Request $request): JsonResponse
    {
        // Eloquent global scope excludes soft-deleted templates, so archived
        // shifts never appear as active scheduling choices.
        $shifts = \App\Models\StaffShift::orderBy('name')->get(['id', 'name', 'start_time', 'end_time']);

        return $this->success($shifts->toArray());
    }

    /**
     * Attendance listing (GET /staff/attendance).
     *
     * Supported filters: staff_id, date, date_from, date_to, status, search,
     * page/per_page. Search matches employee name, employee ID, and user
     * name/email. Returns real attendance records with staff info.
     */
    public function attendance(Request $request): JsonResponse
    {
        $request->validate([
            'staff_id' => 'nullable|uuid',
            'date' => 'nullable|date',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'status' => 'nullable|string|max:30',
            'search' => 'nullable|string|max:100',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = Attendance::with('staff.user');

        if ($staffId = $request->input('staff_id')) {
            $query->where('staff_id', $staffId);
        }

        if ($date = $request->input('date')) {
            $query->whereDate('clock_in', $date);
        }

        if ($from = $request->input('date_from')) {
            $query->whereDate('clock_in', '>=', $from);
        }

        if ($to = $request->input('date_to')) {
            $query->whereDate('clock_in', '<=', $to);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $search = trim((string) $request->input('search', ''));
        if ($search !== '') {
            $like = '%'.strtolower($search).'%';
            $query->where(function ($q) use ($like) {
                $q->whereHas('staff', function ($sq) use ($like) {
                    $sq->whereRaw('LOWER(employee_id) LIKE ?', [$like])
                        ->orWhereHas('user', function ($uq) use ($like) {
                            $uq->whereRaw('LOWER(name) LIKE ?', [$like])
                                ->orWhereRaw('LOWER(email) LIKE ?', [$like]);
                        });
                });
            });
        }

        $records = $query->orderByDesc('clock_in')
            ->paginate($request->integer('per_page', 15));

        $data = $records->getCollection()->map(fn (Attendance $a) => [
            'id' => $a->id,
            'staff_id' => $a->staff_id,
            'staff' => $a->staff ? [
                'id' => $a->staff->id,
                'employee_id' => $a->staff->employee_id,
                'name' => $a->staff->user?->name,
            ] : null,
            'date' => $a->clock_in?->toDateString(),
            'clock_in' => $a->clock_in?->toISOString(),
            'clock_out' => $a->clock_out?->toISOString(),
            'hours_worked' => $a->hours_worked !== null ? (float) $a->hours_worked : null,
            'status' => $a->status,
            'notes' => $a->notes,
            'created_at' => $a->created_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $records->currentPage(),
                'last_page' => $records->lastPage(),
                'per_page' => $records->perPage(),
                'total' => $records->total(),
            ],
        ]);
    }

    /**
     * Update an existing shift schedule (PUT /staff/schedule/{id}).
     */
    public function updateSchedule(Request $request, string $id): JsonResponse
    {
        $schedule = ShiftSchedule::find($id);

        if (!$schedule) {
            return $this->notFound('Schedule not found.');
        }

        $validated = $request->validate([
            'staff_id' => 'sometimes|uuid|exists:staff_profiles,id',
            'shift_id' => 'sometimes|uuid|exists:staff_shifts,id',
            'date' => 'sometimes|date',
            'status' => 'sometimes|string|in:scheduled,confirmed,completed,absent,swap,cancelled',
            'notes' => 'nullable|string|max:500',
        ]);

        $targetStaffId = $validated['staff_id'] ?? $schedule->staff_id;
        $targetShiftId = $validated['shift_id'] ?? $schedule->shift_id;
        $targetDate = $validated['date'] ?? $schedule->date?->toDateString();

        // Re-validate business rules on the resulting assignment: the target
        // staff must exist and be active, the target shift must exist and not
        // be soft-deleted. Night shifts crossing midnight stay valid because
        // assignments are date-keyed, not time-range-keyed.
        $targetStaff = StaffProfile::with('user')->find($targetStaffId);
        if (!$targetStaff) {
            return $this->notFound('Staff profile not found.');
        }
        if (!$targetStaff->is_active) {
            return $this->error('Cannot schedule inactive staff.', 422);
        }
        if (!StaffShift::find($targetShiftId)) {
            return $this->error('Selected shift is no longer available.', 422);
        }

        // Conflict check: same staff may not hold two schedules on one date.
        $conflict = ShiftSchedule::where('staff_id', $targetStaffId)
            ->whereDate('date', $targetDate)
            ->where('id', '!=', $schedule->id)
            ->exists();

        if ($conflict) {
            return $this->error('Staff already has a schedule for this date.', 409);
        }

        $schedule->update($validated);

        $schedule->load(['staff.user', 'shift']);

        \App\Services\AuditLogger::record('shift_schedule_updated', $schedule, [
            'description' => 'Shift schedule updated for '
                .($schedule->staff?->employee_id ?? $targetStaffId)
                .($schedule->staff?->user?->name ? " — {$schedule->staff->user->name}" : '')
                .' on '.($schedule->date?->toDateString() ?? ''),
        ]);

        return $this->success($this->formatSchedule($schedule), 'Schedule updated successfully.');
    }

    /**
     * Delete a shift schedule (DELETE /staff/schedule/{id}).
     */
    public function destroySchedule(string $id): JsonResponse
    {
        $schedule = ShiftSchedule::with(['staff.user'])->find($id);

        if (!$schedule) {
            return $this->notFound('Schedule not found.');
        }

        $employeeId = $schedule->staff?->employee_id ?? $schedule->staff_id;
        $employeeName = $schedule->staff?->user?->name;
        $scheduleDate = $schedule->date?->toDateString() ?? '';

        $schedule->delete();

        \App\Services\AuditLogger::record('shift_schedule_deleted', $schedule, [
            'description' => 'Shift schedule deleted for '
                .$employeeId
                .($employeeName ? " — {$employeeName}" : '')
                .' on '.$scheduleDate,
        ]);

        return $this->noContent();
    }

    public function createSchedule(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'staff_id' => 'required|uuid|exists:staff_profiles,id',
            'shift_id' => 'required|uuid|exists:staff_shifts,id',
            'date' => 'required|date',
            'status' => 'sometimes|string|in:scheduled,confirmed,absent,swap',
            'notes' => 'nullable|string|max:500',
        ]);

        // Business rules: target staff must exist and be active; the shift
        // template must exist and not be soft-deleted (the exists rule above
        // queries the table directly, so trashed shifts need an explicit
        // Eloquent check). Multiple employees may share one shift template,
        // and night shifts crossing midnight remain valid because the model
        // is date-keyed.
        $targetStaff = StaffProfile::with('user')->find($validated['staff_id']);
        if (!$targetStaff) {
            return $this->notFound('Staff profile not found.');
        }
        if (!$targetStaff->is_active) {
            return $this->error('Cannot schedule inactive staff.', 422);
        }
        if (!StaffShift::find($validated['shift_id'])) {
            return $this->error('Selected shift is no longer available.', 422);
        }

        $existing = ShiftSchedule::where('staff_id', $validated['staff_id'])
            ->whereDate('date', $validated['date'])
            ->first();

        if ($existing) {
            return $this->error('Staff already has a schedule for this date.', 409);
        }

        $schedule = ShiftSchedule::create($validated);

        $schedule->load(['staff.user', 'shift']);

        \App\Services\AuditLogger::record('shift_scheduled', $schedule, [
            'description' => 'Shift scheduled for '
                .($schedule->staff?->employee_id ?? $validated['staff_id'])
                .($schedule->staff?->user?->name ? " — {$schedule->staff->user->name}" : '')
                .' on '.($schedule->date?->toDateString() ?? ''),
        ]);

        return $this->created($this->formatSchedule($schedule), 'Schedule created successfully.');
    }

    public function commissions(Request $request, string $id): JsonResponse
    {
        $staff = StaffProfile::find($id);

        if (!$staff) {
            return $this->notFound('Staff profile not found.');
        }

        $commissions = StaffCommission::with('order')
            ->where('staff_id', $id)
            ->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $commissions->getCollection()->map(fn (StaffCommission $c) => [
            'id' => $c->id,
            'amount' => (float) $c->amount,
            'type' => $c->type,
            'order' => $c->order ? [
                'id' => $c->order->id,
                'order_number' => $c->order->order_number,
                'total' => (float) $c->order->total,
            ] : null,
            'created_at' => $c->created_at?->toISOString(),
        ]);

        $totalCommission = $commissions->getCollection()->sum('amount');

        return $this->success([
            'items' => $data,
            'total_commission' => $totalCommission,
            'pagination' => [
                'current_page' => $commissions->currentPage(),
                'last_page' => $commissions->lastPage(),
                'per_page' => $commissions->perPage(),
                'total' => $commissions->total(),
            ],
        ]);
    }

    public function requestLeave(Request $request, string $id): JsonResponse
    {
        $staff = StaffProfile::with('user')->find($id);

        if (!$staff) {
            return $this->notFound('Staff profile not found.');
        }

        // Ownership gate: operational roles may request leave only for their
        // own linked staff profile. Never trust the frontend-provided ID
        // alone. Admin/manager keep override access for any staff.
        if (! $request->user()->hasRole('admin') && ! $request->user()->hasRole('manager')) {
            $ownProfile = StaffProfile::where('user_id', $request->user()->id)->first();
            if (! $ownProfile || $ownProfile->id !== $id) {
                return $this->error('You may only request leave for your own staff profile.', 403);
            }
        }

        $validated = $request->validate([
            'date' => 'required|date',
            'reason' => 'required|string|max:1000',
        ]);

        $existing = ShiftSchedule::where('staff_id', $id)
            ->whereDate('date', $validated['date'])
            ->first();

        if ($existing) {
            $existing->update(['status' => 'absent', 'notes' => $validated['reason']]);
            $leaveSchedule = $existing;
        } else {
            // A leave without an existing assignment still needs a shift
            // template row; fail cleanly instead of a NOT NULL crash when
            // none exists.
            $fallbackShiftId = StaffShift::first()?->id;
            if (!$fallbackShiftId) {
                return $this->error('No shift templates available for leave recording.', 422);
            }
            $leaveSchedule = ShiftSchedule::create([
                'staff_id' => $id,
                'shift_id' => $fallbackShiftId,
                'date' => $validated['date'],
                'status' => 'absent',
                'notes' => $validated['reason'],
            ]);
        }

        \App\Services\AuditLogger::record('leave_requested', $leaveSchedule, [
            'description' => "Leave requested for {$staff->employee_id} on {$validated['date']}: {$validated['reason']}",
        ]);

        return $this->success([
            'staff_id' => $staff->id,
            'date' => $validated['date'],
            'status' => 'absent',
        ], 'Leave request recorded successfully.');
    }
}
