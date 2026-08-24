<?php

declare(strict_types=1);

namespace App\Models;

class Permission extends BaseModel
{
    protected $fillable = ['id', 'name', 'display_name', 'module', 'description'];

    public function getTable(): string
    {
        return 'permissions';
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'role_has_permissions', 'permission_id', 'role_id');
    }
}
