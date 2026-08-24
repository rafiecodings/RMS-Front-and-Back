<?php

use App\Http\Controllers\Api\V1\Table\ReservationController;
use App\Http\Controllers\Api\V1\Table\WaitlistController;
use Illuminate\Support\Facades\Route;

// Read access: admin, manager, waiter (cashier excluded)
Route::middleware(['auth:sanctum', 'role:admin,manager,waiter'])->prefix('reservations')->group(function () {
    Route::get('/', [ReservationController::class, 'index']);
    Route::get('/calendar', [ReservationController::class, 'calendar']);
    Route::get('/{id}', [ReservationController::class, 'show'])->whereUuid('id');
    // Mutations: admin, manager only (waiter can view but not create/edit for "limited view")
    Route::post('/', [ReservationController::class, 'store'])->middleware('role:admin,manager');
    Route::put('/{id}', [ReservationController::class, 'update'])->whereUuid('id')->middleware('role:admin,manager');
    Route::patch('/{id}/status', [ReservationController::class, 'updateStatus'])->whereUuid('id')->middleware('role:admin,manager');
    Route::patch('/{id}/archive', [ReservationController::class, 'archive'])->whereUuid('id')->middleware('role:admin,manager');
});

Route::middleware(['auth:sanctum', 'role:admin,manager,waiter'])->prefix('waitlist')->group(function () {
    Route::get('/', [WaitlistController::class, 'index']);
    Route::post('/', [WaitlistController::class, 'store'])->middleware('role:admin,manager');
    Route::patch('/{id}/status', [WaitlistController::class, 'updateStatus'])->whereUuid('id')->middleware('role:admin,manager');
});
