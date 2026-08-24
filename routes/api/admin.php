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
        Route::get('/{id}', [OutletController::class, 'show'])->whereUuid('id');
        Route::put('/{id}', [OutletController::class, 'update'])->whereUuid('id');
    });

    Route::prefix('users')->group(function () {
        Route::get('/', [UserController::class, 'index']);
        Route::post('/', [UserController::class, 'store'])->middleware('role:admin');
        Route::get('/{id}', [UserController::class, 'show'])->whereUuid('id');
        Route::put('/{id}', [UserController::class, 'update'])->whereUuid('id')->middleware('role:admin');
        Route::delete('/{id}', [UserController::class, 'destroy'])->whereUuid('id')->middleware('role:admin');
    });

    Route::prefix('roles')->group(function () {
        Route::get('/', [RoleController::class, 'index']);
        Route::post('/', [RoleController::class, 'store']);
        Route::get('/{id}', [RoleController::class, 'show'])->whereUuid('id');
        Route::put('/{id}', [RoleController::class, 'update'])->whereUuid('id');
        Route::delete('/{id}', [RoleController::class, 'destroy'])->whereUuid('id');
    });

    Route::get('/permissions', [PermissionController::class, 'index']);
    Route::get('/audit-logs', [AuditLogController::class, 'index']);

    Route::prefix('settings')->group(function () {
        // Managers may view restaurant configuration; only admins may change
        // it (matches permissions.ts settings: manager=view, admin=edit).
        Route::get('/', [SettingController::class, 'index']);
        Route::put('/', [SettingController::class, 'update'])->middleware('role:admin');
    });
});
