<?php

use App\Http\Controllers\Api\V1\Table\ReservationController;
use App\Http\Controllers\Api\V1\Table\WaitlistController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->group(function () {
    Route::prefix('reservations')->group(function () {
        Route::get('/', [ReservationController::class, 'index']);
        Route::post('/', [ReservationController::class, 'store']);
        Route::get('/calendar', [ReservationController::class, 'calendar']);
        Route::get('/{id}', [ReservationController::class, 'show']);
        Route::put('/{id}', [ReservationController::class, 'update']);
        Route::patch('/{id}/status', [ReservationController::class, 'updateStatus']);
    });

    Route::prefix('waitlist')->group(function () {
        Route::get('/', [WaitlistController::class, 'index']);
        Route::post('/', [WaitlistController::class, 'store']);
        Route::patch('/{id}/status', [WaitlistController::class, 'updateStatus']);
    });
});
