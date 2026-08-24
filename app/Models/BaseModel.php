<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Schema;

abstract class BaseModel extends Model
{
    use HasFactory, SoftDeletes, HasUuid;

    protected $keyType = 'string';
    public $incrementing = false;

    protected static function booted(): void
    {
        static::creating(function (Model $model) {
            if (Schema::hasColumn($model->getTable(), 'created_by') && empty($model->created_by) && auth()->check()) {
                $model->created_by = auth()->id();
            }
        });

        static::updating(function (Model $model) {
            if (Schema::hasColumn($model->getTable(), 'updated_by') && empty($model->updated_by) && auth()->check()) {
                $model->updated_by = auth()->id();
            }
        });
    }

    public function getTable(): string
    {
        return parent::getTable();
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOfOutlet($query, string $outletId)
    {
        return $query->where('outlet_id', $outletId);
    }
}
