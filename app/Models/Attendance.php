<?php

declare(strict_types=1);

namespace App\Models;

class Attendance extends BaseModel
{
    protected $fillable = [
        'staff_id',
        'clock_in',
        'clock_out',
        'hours_worked',
        'status',
        'notes',
    ];

    protected $casts = [
        'clock_in' => 'datetime',
        'clock_out' => 'datetime',
        'hours_worked' => 'decimal:2',
    ];

    public function getTable(): string
    {
        return 'attendance';
    }

    public function staff()
    {
        return $this->belongsTo(StaffProfile::class, 'staff_id');
    }
}
