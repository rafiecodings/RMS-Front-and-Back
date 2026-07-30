<?php

use App\Http\Controllers\Api\V1\Staff\StaffController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->prefix('staff')->group(function () {
    Route::get('/', [StaffController::class, 'index']);
    Route::post('/', [StaffController::class, 'store']);
    Route::get('/{id}', [StaffController::class, 'show']);
    Route::put('/{id}', [StaffController::class, 'update']);
    Route::get('/{id}/performance', [StaffController::class, 'performance']);
    Route::post('/clock-in', [StaffController::class, 'clockIn']);
    Route::post('/clock-out', [StaffController::class, 'clockOut']);
    Route::get('/schedule', [StaffController::class, 'schedule']);
    Route::post('/schedule', [StaffController::class, 'createSchedule']);
    Route::get('/{id}/commissions', [StaffController::class, 'commissions']);
    Route::post('/{id}/leave', [StaffController::class, 'requestLeave']);
});
