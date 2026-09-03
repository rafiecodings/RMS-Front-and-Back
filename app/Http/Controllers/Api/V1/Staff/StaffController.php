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

        $clockOut = now();
        $hoursWorked = $attendance->clock_in->diffInMinutes($clockOut) / 60;

        $attendance->update([
            'clock_out' => $clockOut,
            'hours_worked' => round($hoursWorked, 2),
        ]);

        return $this->success([
            'id' => $attendance->id,
            'staff_id' => $attendance->staff_id,
            'clock_in' => $attendance->clock_in?->toISOString(),
            'clock_out' => $attendance->clock_out?->toISOString(),
            'hours_worked' => (float) $attendance->hours_worked,
        ], 'Clock out recorded successfully.');
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

        if ($staffId = $request->input('staff_id')) {
            $query->where('staff_id', $staffId);
        }

        $schedules = $query->orderBy('date')
            ->paginate($request->integer('per_page', 15));

        $data = $schedules->getCollection()->map(fn (ShiftSchedule $s) => [
            'id' => $s->id,
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
        ]);

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
        $shifts = \App\Models\StaffShift::all(['id', 'name', 'start_time', 'end_time']);

        return $this->success($shifts->toArray());
    }

    /**
     * Attendance listing (GET /staff/attendance).
     *
     * Supported filters: staff_id, date, date_from, date_to, status,
     * page/per_page. Returns real attendance records with staff info.
     */
    public function attendance(Request $request): JsonResponse
    {
        $request->validate([
            'staff_id' => 'nullable|uuid',
            'date' => 'nullable|date',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'status' => 'nullable|string|max:30',
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
        $targetDate = $validated['date'] ?? $schedule->date?->toDateString();

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

        return $this->success([
            'id' => $schedule->id,
            'date' => $schedule->date?->toDateString(),
            'status' => $schedule->status,
            'notes' => $schedule->notes,
            'staff' => $schedule->staff ? [
                'id' => $schedule->staff->id,
                'employee_id' => $schedule->staff->employee_id,
                'name' => $schedule->staff->user?->name,
            ] : null,
            'shift' => $schedule->shift ? [
                'id' => $schedule->shift->id,
                'name' => $schedule->shift->name,
                'start_time' => $schedule->shift->start_time,
                'end_time' => $schedule->shift->end_time,
            ] : null,
            'created_at' => $schedule->created_at?->toISOString(),
        ], 'Schedule updated successfully.');
    }

    /**
     * Delete a shift schedule (DELETE /staff/schedule/{id}).
     */
    public function destroySchedule(string $id): JsonResponse
    {
        $schedule = ShiftSchedule::find($id);

        if (!$schedule) {
            return $this->notFound('Schedule not found.');
        }

        $schedule->delete();

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

        $existing = ShiftSchedule::where('staff_id', $validated['staff_id'])
            ->whereDate('date', $validated['date'])
            ->first();

        if ($existing) {
            return $this->error('Staff already has a schedule for this date.', 409);
        }

        $schedule = ShiftSchedule::create($validated);

        $schedule->load(['staff.user', 'shift']);

        return $this->created([
            'id' => $schedule->id,
            'date' => $schedule->date?->toDateString(),
            'status' => $schedule->status,
            'staff' => $schedule->staff ? [
                'id' => $schedule->staff->id,
                'employee_id' => $schedule->staff->employee_id,
                'name' => $schedule->staff->user?->name,
            ] : null,
            'shift' => $schedule->shift ? [
                'id' => $schedule->shift->id,
                'name' => $schedule->shift->name,
                'start_time' => $schedule->shift->start_time,
                'end_time' => $schedule->shift->end_time,
            ] : null,
            'created_at' => $schedule->created_at?->toISOString(),
        ], 'Schedule created successfully.');
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
        $staff = StaffProfile::find($id);

        if (!$staff) {
            return $this->notFound('Staff profile not found.');
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
        } else {
            ShiftSchedule::create([
                'staff_id' => $id,
                'shift_id' => StaffShift::first()?->id,
                'date' => $validated['date'],
                'status' => 'absent',
                'notes' => $validated['reason'],
            ]);
        }

        return $this->success([
            'staff_id' => $staff->id,
            'date' => $validated['date'],
            'status' => 'absent',
        ], 'Leave request recorded successfully.');
    }
}
