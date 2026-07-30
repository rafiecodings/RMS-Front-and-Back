<?php

use App\Http\Controllers\Api\V1\Admin\AuditLogController;
use App\Http\Controllers\Api\V1\Admin\OutletController;
use App\Http\Controllers\Api\V1\Admin\PermissionController;
use App\Http\Controllers\Api\V1\Admin\RoleController;
use App\Http\Controllers\Api\V1\Admin\SettingController;
use App\Http\Controllers\Api\V1\Admin\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->prefix('admin')->group(function () {
    Route::prefix('outlets')->group(function () {
        Route::get('/', [OutletController::class, 'index']);
        Route::post('/', [OutletController::class, 'store']);
        Route::get('/{id}', [OutletController::class, 'show']);
        Route::put('/{id}', [OutletController::class, 'update']);
    });

    Route::prefix('users')->group(function () {
        Route::get('/', [UserController::class, 'index']);
        Route::post('/', [UserController::class, 'store']);
        Route::get('/{id}', [UserController::class, 'show']);
        Route::put('/{id}', [UserController::class, 'update']);
        Route::delete('/{id}', [UserController::class, 'destroy']);
    });

    Route::prefix('roles')->group(function () {
        Route::get('/', [RoleController::class, 'index']);
        Route::post('/', [RoleController::class, 'store']);
        Route::get('/{id}', [RoleController::class, 'show']);
        Route::put('/{id}', [RoleController::class, 'update']);
        Route::delete('/{id}', [RoleController::class, 'destroy']);
    });

    Route::get('/permissions', [PermissionController::class, 'index']);
    Route::get('/audit-logs', [AuditLogController::class, 'index']);

    Route::prefix('settings')->group(function () {
        Route::get('/', [SettingController::class, 'index']);
        Route::put('/', [SettingController::class, 'update']);
    });
});
