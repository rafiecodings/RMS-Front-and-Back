<?php

use App\Http\Controllers\Api\V1\Table\ReservationController;
use App\Http\Controllers\Api\V1\Table\WaitlistController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum','active'])->group(function () {
    Route::prefix('reservations')->group(function () {
        Route::get('/', [ReservationController::class, 'index']);
        Route::post('/', [ReservationController::class, 'store'])->middleware('role:admin,manager,waiter');
        Route::get('/calendar', [ReservationController::class, 'calendar']);
        Route::get('/{id}', [ReservationController::class, 'show']);
        Route::put('/{id}', [ReservationController::class, 'update'])->middleware('role:admin,manager,waiter');
        Route::patch('/{id}/status', [ReservationController::class, 'updateStatus'])->middleware('role:admin,manager,waiter');
        Route::patch('/{id}/archive', [ReservationController::class, 'archive'])->middleware('role:admin,manager');
        Route::delete('/{id}/archive', [ReservationController::class, 'unarchive'])->middleware('role:admin,manager');
    });

    Route::prefix('waitlist')->group(function () {
        Route::get('/', [WaitlistController::class, 'index']);
        Route::post('/', [WaitlistController::class, 'store']);
        Route::patch('/{id}/status', [WaitlistController::class, 'updateStatus']);
    });
});
