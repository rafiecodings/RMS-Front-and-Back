<?php

declare(strict_types=1);

namespace App\Models;

class Table extends BaseModel
{
    protected $fillable = [
        'floor_plan_id', 'number', 'capacity', 'status', 'shape',
        'pos_x', 'pos_y', 'width', 'height', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'capacity' => 'integer',
            'pos_x' => 'decimal:2',
            'pos_y' => 'decimal:2',
            'width' => 'decimal:2',
            'height' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function getTable(): string
    {
        return 'tables';
    }

    public function floorPlan()
    {
        return $this->belongsTo(FloorPlan::class);
    }

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
