<?php

declare(strict_types=1);

namespace App\Models;

class StaffShift extends BaseModel
{
    protected $fillable = [
        'name',
        'start_time',
        'end_time',
    ];

    protected $casts = [
        'start_time' => 'string',
        'end_time' => 'string',
    ];

    public function getTable(): string
    {
        return 'staff_shifts';
    }

    public function schedules()
    {
        return $this->hasMany(ShiftSchedule::class);
    }
}
