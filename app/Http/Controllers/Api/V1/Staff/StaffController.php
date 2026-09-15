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
        $staff = StaffProfile::with('user')->find($id);

        if (!$staff) {
            return $this->notFound('Staff profile not found.');
        }

        // Ownership: operational may view only own.
        if (! $request->user()->hasRole('admin') && ! $request->user()->hasRole('manager')) {
            $own = StaffProfile::where('user_id', $request->user()->id)->first();
            if (! $own || $own->id !== $id) {
                return $this->error('You may only view your own performance.', 403);
            }
        }

        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $start = $validated['start_date'] ?? now()->startOfMonth()->toDateString();
        $end = $validated['end_date'] ?? now()->toDateString();

        $startDt = \Illuminate\Support\Carbon::parse($start)->startOfDay();
        $endDt = \Illuminate\Support\Carbon::parse($end)->endOfDay();

        // Orders attribution: orders.created_by -> users.id -> staff_profiles.user_id
        $ordersQuery = \App\Models\Order::where('created_by', $staff->user_id)
            ->where('status', 'completed')
            ->whereBetween('created_at', [$startDt, $endDt]);
        $ordersHandled = (int) (clone $ordersQuery)->count();
        $totalSales = (float) (clone $ordersQuery)->sum('total');

        // Attendance: trustworthy hours_worked / days_present
        $attQuery = \App\Models\Attendance::where('staff_id', $id)
            ->whereBetween('clock_in', [$startDt, $endDt])
            ->whereNotNull('hours_worked');
        $hoursWorked = round((float) $attQuery->sum('hours_worked'), 2);
        $daysPresent = (int) \App\Models\Attendance::where('staff_id', $id)
            ->whereBetween('clock_in', [$startDt, $endDt])
            ->selectRaw('DATE(clock_in) as d')
            ->distinct()
            ->get()->count();

        // StaffPerformance snapshot is legacy/unused for active analytics.
        return $this->success([
            'staff' => [
                'id' => $staff->id,
                'employee_id' => $staff->employee_id,
                'name' => $staff->user?->name,
            ],
            'period' => ['start_date' => $start, 'end_date' => $end],
            'orders_handled' => $ordersHandled,
            'total_sales' => $totalSales,
            'hours_worked' => $hoursWorked,
            'days_present' => $daysPresent,
        ]);
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

        if (! $request->user()->hasRole('admin') && ! $request->user()->hasRole('manager')) {
            $own = StaffProfile::where('user_id', $request->user()->id)->first();
            if (! $own || $own->id !== $id) {
                return $this->error('You may only view your own commissions.', 403);
            }
        }

        // Read-only, no auto-creation; exclude legacy rows tied to cancelled/voided orders.
        $baseQuery = StaffCommission::with('order')
            ->where('staff_id', $id)
            ->whereHas('order', fn ($q) => $q->whereNotIn('status', ['cancelled', 'voided']))
            ->whereDoesntHave('order', fn ($q) => $q->whereNotNull('archived_at'));

        $totalCommission = (float) (clone $baseQuery)->sum('amount');

        $commissions = (clone $baseQuery)
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

    private function formatLeave(\App\Models\LeaveRequest $l): array
    {
        $l->loadMissing(['staff.user', 'decider']);
        return [
            'id' => $l->id,
            'staff_id' => $l->staff_id,
            'leave_type' => $l->leave_type,
            'reason' => $l->reason,
            'start_date' => $l->start_date?->toDateString(),
            'end_date' => $l->end_date?->toDateString(),
            'status' => $l->status,
            'requested_at' => $l->requested_at?->toISOString(),
            'decided_by' => $l->decided_by,
            'decided_at' => $l->decided_at?->toISOString(),
            'decision_notes' => $l->decision_notes,
            'staff' => $l->staff ? [
                'id' => $l->staff->id,
                'employee_id' => $l->staff->employee_id,
                'name' => $l->staff->user?->name,
            ] : null,
            'decider' => $l->decider ? [
                'id' => $l->decider->id,
                'name' => $l->decider->name,
            ] : null,
            'created_at' => $l->created_at?->toISOString(),
            'updated_at' => $l->updated_at?->toISOString(),
        ];
    }

    public function leaveIndex(Request $request): JsonResponse
    {
        $request->validate([
            'status' => 'nullable|string|in:requested,approved,rejected,cancelled',
            'staff_id' => 'nullable|uuid',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $isPrivileged = $request->user()->hasRole('admin') || $request->user()->hasRole('manager');

        if (!$isPrivileged) {
            $ownProfile = StaffProfile::where('user_id', $request->user()->id)->first();
            if (!$ownProfile) {
                return $this->success([
                    'items' => [],
                    'pagination' => ['current_page' => 1, 'last_page' => 1, 'per_page' => $request->integer('per_page', 15), 'total' => 0],
                ]);
            }
            if ($request->filled('staff_id') && $request->input('staff_id') !== $ownProfile->id) {
                return $this->error('You may only view your own leave requests.', 403);
            }
        }

        $query = \App\Models\LeaveRequest::with(['staff.user', 'decider'])
            ->orderByDesc('requested_at')->orderByDesc('created_at');

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if (!$isPrivileged) {
            $query->where('staff_id', $ownProfile->id);
        } elseif ($staffId = $request->input('staff_id')) {
            $query->where('staff_id', $staffId);
        }

        if ($from = $request->input('date_from')) {
            $query->where('end_date', '>=', $from);
        }
        if ($to = $request->input('date_to')) {
            $query->where('start_date', '<=', $to);
        }

        $leaves = $query->paginate($request->integer('per_page', 15));
        $data = $leaves->getCollection()->map(fn (\App\Models\LeaveRequest $l) => $this->formatLeave($l));

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $leaves->currentPage(),
                'last_page' => $leaves->lastPage(),
                'per_page' => $leaves->perPage(),
                'total' => $leaves->total(),
            ],
        ]);
    }

    public function requestLeave(Request $request, string $id): JsonResponse
    {
        $staff = StaffProfile::with('user')->find($id);

        if (!$staff) {
            return $this->notFound('Staff profile not found.');
        }

        if (!$staff->is_active) {
            return $this->error('Cannot request leave for inactive staff.', 422);
        }

        if (! $request->user()->hasRole('admin') && ! $request->user()->hasRole('manager')) {
            $ownProfile = StaffProfile::where('user_id', $request->user()->id)->first();
            if (! $ownProfile || $ownProfile->id !== $id) {
                return $this->error('You may only request leave for your own staff profile.', 403);
            }
        }

        $validated = $request->validate([
            'leave_type' => 'required|string|in:sick,vacation,emergency,unpaid,other',
            'reason' => 'required|string|max:1000',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'date' => 'nullable|date',
        ]);

        if ($request->filled('date') && !$request->filled('start_date')) {
            $validated['start_date'] = $validated['date'];
            $validated['end_date'] = $validated['date'];
        }

        $start = $validated['start_date'];
        $end = $validated['end_date'];

        $overlap = \App\Models\LeaveRequest::where('staff_id', $id)
            ->whereIn('status', ['requested', 'approved'])
            ->where('start_date', '<=', $end)
            ->where('end_date', '>=', $start)
            ->exists();
        if ($overlap) {
            return $this->error('An active leave request already overlaps this date range.', 409);
        }

        $duplicate = \App\Models\LeaveRequest::where('staff_id', $id)
            ->where('leave_type', $validated['leave_type'])
            ->where('reason', $validated['reason'])
            ->whereDate('start_date', $start)
            ->whereDate('end_date', $end)
            ->whereIn('status', ['requested', 'approved'])
            ->exists();
        if ($duplicate) {
            return $this->error('Duplicate leave request.', 409);
        }

        $leave = \App\Models\LeaveRequest::create([
            'staff_id' => $id,
            'leave_type' => $validated['leave_type'],
            'reason' => $validated['reason'],
            'start_date' => $start,
            'end_date' => $end,
            'status' => 'requested',
            'requested_at' => now(),
        ]);

        $leave->load(['staff.user']);

        \App\Services\AuditLogger::record('leave_requested', $leave, [
            'description' => "Leave requested for {$staff->employee_id}"
                .($staff->user?->name ? " — {$staff->user->name}" : '')
                ." ({$validated['leave_type']}) {$start} to {$end}: {$validated['reason']}",
        ]);

        return $this->created($this->formatLeave($leave), 'Leave request submitted successfully.');
    }

    public function approveLeave(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'decision_notes' => 'nullable|string|max:1000',
        ]);

        return DB::transaction(function () use ($id, $validated, $request) {
            $leave = \App\Models\LeaveRequest::with(['staff.user'])->lockForUpdate()->find($id);
            if (!$leave) {
                return $this->notFound('Leave request not found.');
            }
            if ($leave->status !== 'requested') {
                return $this->error('Only requested leave can be approved.', 422);
            }

            $start = $leave->start_date->toDateString();
            $end = $leave->end_date->toDateString();

            $hasCompleted = ShiftSchedule::where('staff_id', $leave->staff_id)
                ->whereDate('date', '>=', $start)
                ->whereDate('date', '<=', $end)
                ->where('status', 'completed')
                ->exists();
            if ($hasCompleted) {
                return $this->error('Cannot approve leave overlapping completed shifts.', 409);
            }

            $conflictingApproved = \App\Models\LeaveRequest::where('staff_id', $leave->staff_id)
                ->where('id', '!=', $leave->id)
                ->where('status', 'approved')
                ->where('start_date', '<=', $end)
                ->where('end_date', '>=', $start)
                ->exists();
            if ($conflictingApproved) {
                return $this->error('Another approved leave already covers this period.', 409);
            }

            $periodStart = \Illuminate\Support\Carbon::parse($start);
            $periodEnd = \Illuminate\Support\Carbon::parse($end);
            for ($d = $periodStart->copy(); $d->lte($periodEnd); $d->addDay()) {
                $dateStr = $d->toDateString();
                $schedule = ShiftSchedule::where('staff_id', $leave->staff_id)
                    ->whereDate('date', $dateStr)
                    ->first();
                if (!$schedule) {
                    continue;
                }
                if ($schedule->status === 'cancelled') {
                    continue;
                }
                if (in_array($schedule->status, ['scheduled', 'confirmed'], true)) {
                    $schedule->update([
                        'status' => 'absent',
                        'notes' => trim(($schedule->notes ? $schedule->notes.' | ' : '')."On approved {$leave->leave_type} leave {$start} to {$end}: {$leave->reason}"),
                    ]);
                }
            }

            $leave->update([
                'status' => 'approved',
                'decided_by' => $request->user()->id,
                'decided_at' => now(),
                'decision_notes' => $validated['decision_notes'] ?? null,
            ]);

            \App\Services\AuditLogger::record('leave_approved', $leave, [
                'description' => "Leave approved for {$leave->staff?->employee_id}"
                    .($leave->staff?->user?->name ? " — {$leave->staff->user->name}" : '')
                    ." ({$leave->leave_type}) {$start} to {$end}",
            ]);

            return $this->success($this->formatLeave($leave->fresh(['staff.user', 'decider'])), 'Leave approved successfully.');
        });
    }

    public function rejectLeave(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'decision_notes' => 'nullable|string|max:1000',
        ]);

        $leave = \App\Models\LeaveRequest::with(['staff.user'])->find($id);
        if (!$leave) {
            return $this->notFound('Leave request not found.');
        }
        if ($leave->status !== 'requested') {
            return $this->error('Only requested leave can be rejected.', 422);
        }

        $leave->update([
            'status' => 'rejected',
            'decided_by' => $request->user()->id,
            'decided_at' => now(),
            'decision_notes' => $validated['decision_notes'] ?? null,
        ]);

        \App\Services\AuditLogger::record('leave_rejected', $leave, [
            'description' => "Leave rejected for {$leave->staff?->employee_id}"
                .($leave->staff?->user?->name ? " — {$leave->staff->user->name}" : '')
                ." ({$leave->leave_type}) {$leave->start_date->toDateString()} to {$leave->end_date->toDateString()}",
        ]);

        return $this->success($this->formatLeave($leave), 'Leave rejected successfully.');
    }

    public function cancelLeave(Request $request, string $id): JsonResponse
    {
        $leave = \App\Models\LeaveRequest::with(['staff.user'])->find($id);
        if (!$leave) {
            return $this->notFound('Leave request not found.');
        }
        if ($leave->status !== 'requested') {
            return $this->error('Only requested leave can be cancelled.', 422);
        }

        $isPrivileged = $request->user()->hasRole('admin') || $request->user()->hasRole('manager');
        if (!$isPrivileged) {
            $ownProfile = StaffProfile::where('user_id', $request->user()->id)->first();
            if (! $ownProfile || $ownProfile->id !== $leave->staff_id) {
                return $this->error('You may only cancel your own leave request.', 403);
            }
        }

        $leave->update([
            'status' => 'cancelled',
            'decided_by' => $request->user()->id,
            'decided_at' => now(),
        ]);

        \App\Services\AuditLogger::record('leave_cancelled', $leave, [
            'description' => "Leave cancelled for {$leave->staff?->employee_id}"
                .($leave->staff?->user?->name ? " — {$leave->staff->user->name}" : '')
                ." ({$leave->leave_type}) {$leave->start_date->toDateString()} to {$leave->end_date->toDateString()}",
        ]);

        return $this->success($this->formatLeave($leave), 'Leave cancelled successfully.');
    }
}
