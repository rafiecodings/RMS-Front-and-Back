<?php

declare(strict_types=1);

namespace App\Models;

class ShiftSchedule extends BaseModel
{
    protected $fillable = [
        'staff_id',
        'shift_id',
        'date',
        'status',
        'notes',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function getTable(): string
    {
        return 'shift_schedules';
    }

    public function staff()
    {
        return $this->belongsTo(StaffProfile::class, 'staff_id');
    }

    public function shift()
    {
        return $this->belongsTo(StaffShift::class);
    }
}
