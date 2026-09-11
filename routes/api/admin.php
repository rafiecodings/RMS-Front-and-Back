<?php

use App\Http\Controllers\Api\V1\Admin\AuditLogController;
use App\Http\Controllers\Api\V1\Admin\OutletController;
use App\Http\Controllers\Api\V1\Admin\PermissionController;
use App\Http\Controllers\Api\V1\Admin\RoleController;
use App\Http\Controllers\Api\V1\Admin\SettingController;
use App\Http\Controllers\Api\V1\Admin\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin,manager'])->prefix('admin')->group(function () {
    Route::prefix('outlets')->group(function () {
        Route::get('/', [OutletController::class, 'index']);
        Route::post('/', [OutletController::class, 'store']);
        Route::get('/{id}', [OutletController::class, 'show']);
        Route::put('/{id}', [OutletController::class, 'update']);
    });

    Route::prefix('users')->group(function () {
        // Read-only oversight: admin + manager may list/view accounts.
        Route::get('/', [UserController::class, 'index']);
        Route::get('/{id}', [UserController::class, 'show']);
        // Mutations are admin-only (server-side RBAC). The Users & Roles UI
        // renders read-only controls for managers; the backend enforces it
        // authoritatively so direct API calls cannot bypass it.
        Route::post('/', [UserController::class, 'store'])->middleware('role:admin');
        Route::put('/{id}', [UserController::class, 'update'])->middleware('role:admin');
        Route::delete('/{id}', [UserController::class, 'destroy'])->middleware('role:admin');
    });

    Route::prefix('roles')->group(function () {
        // Role catalog reads stay visible to managers for oversight.
        Route::get('/', [RoleController::class, 'index']);
        Route::get('/{id}', [RoleController::class, 'show']);
        // Role-definition and permission-sync mutations are admin-only.
        Route::post('/', [RoleController::class, 'store'])->middleware('role:admin');
        Route::put('/{id}', [RoleController::class, 'update'])->middleware('role:admin');
        Route::delete('/{id}', [RoleController::class, 'destroy'])->middleware('role:admin');
    });

    Route::get('/permissions', [PermissionController::class, 'index']);
    Route::get('/audit-logs', [AuditLogController::class, 'index']);

    // Settings: managers may view, but billing/configuration writes are
    // admin-only (server-side RBAC). This keeps sensitive endpoints safe
    // even though the UI already hides edit controls from non-admins.
    Route::prefix('settings')->group(function () {
        Route::get('/', [SettingController::class, 'index'])->middleware('role:admin,manager');
        Route::put('/', [SettingController::class, 'update'])->middleware('role:admin');
    });
});
