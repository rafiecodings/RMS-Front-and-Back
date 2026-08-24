<?php

declare(strict_types=1);

namespace App\Models;

class StaffProfile extends BaseModel
{
    protected $fillable = [
        'user_id',
        'employee_id',
        'position',
        'department',
        'hourly_rate',
        'base_salary',
        'hire_date',
        'end_date',
        'employment_type',
        'phone',
        'address',
        'is_active',
    ];

    protected $casts = [
        'hourly_rate' => 'decimal:2',
        'base_salary' => 'decimal:2',
        'hire_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function getTable(): string
    {
        return 'staff_profiles';
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function shifts()
    {
        return $this->hasMany(ShiftSchedule::class);
    }

    public function attendance()
    {
        return $this->hasMany(Attendance::class);
    }

    public function performance()
    {
        return $this->hasMany(StaffPerformance::class);
    }

    public function commissions()
    {
        return $this->hasMany(StaffCommission::class);
    }
}
