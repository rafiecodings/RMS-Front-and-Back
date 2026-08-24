<?php

declare(strict_types=1);

namespace App\Models;

class Table extends BaseModel
{
    public const STATUS_AVAILABLE = 'available';
    public const STATUS_OCCUPIED = 'occupied';
    public const STATUS_RESERVED = 'reserved';
    public const STATUS_NEEDS_CLEANING = 'needs_cleaning';
    public const STATUS_MAINTENANCE = 'maintenance';

    protected $fillable = [
        'number', 'capacity', 'status', 'shape',
        'pos_x', 'pos_y', 'width', 'height', 'is_active',
        'name', 'zone', 'section', 'is_wheelchair_accessible',
        'parent_table_id',
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
            'is_wheelchair_accessible' => 'boolean',
        ];
    }

    public function getTable(): string
    {
        return 'tables';
    }

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function scopeAvailable($query)
    {
        return $query->where('status', self::STATUS_AVAILABLE);
    }

    public function scopeOccupied($query)
    {
        return $query->where('status', self::STATUS_OCCUPIED);
    }

    public function scopeReserved($query)
    {
        return $query->where('status', self::STATUS_RESERVED);
    }

    public function scopeNeedsCleaning($query)
    {
        return $query->where('status', self::STATUS_NEEDS_CLEANING);
    }

    public function scopeMaintenance($query)
    {
        return $query->where('status', self::STATUS_MAINTENANCE);
    }

    public function isAvailable(): bool
    {
        return $this->status === self::STATUS_AVAILABLE;
    }

    public function isOccupied(): bool
    {
        return $this->status === self::STATUS_OCCUPIED;
    }

    public function isReserved(): bool
    {
        return $this->status === self::STATUS_RESERVED;
    }
}