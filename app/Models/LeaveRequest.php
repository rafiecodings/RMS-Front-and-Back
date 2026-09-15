<?php

declare(strict_types=1);

namespace App\Models;

class LeaveRequest extends BaseModel
{
    protected $fillable = [
        'staff_id',
        'leave_type',
        'reason',
        'start_date',
        'end_date',
        'status',
        'requested_at',
        'decided_by',
        'decided_at',
        'decision_notes',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'requested_at' => 'datetime',
        'decided_at' => 'datetime',
    ];

    public function getTable(): string
    {
        return 'leave_requests';
    }

    public function staff()
    {
        return $this->belongsTo(StaffProfile::class, 'staff_id');
    }

    public function decider()
    {
        return $this->belongsTo(User::class, 'decided_by');
    }
}
