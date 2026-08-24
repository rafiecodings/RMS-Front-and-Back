<?php

declare(strict_types=1);

namespace App\Models;

class FloorPlan extends BaseModel
{
    protected $fillable = ['name', 'description', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return ['sort_order' => 'integer', 'is_active' => 'boolean'];
    }

    public function getTable(): string
    {
        return 'floor_plans';
    }

    public function tables()
    {
        return $this->hasMany(Table::class);
    }
}
