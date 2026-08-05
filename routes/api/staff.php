<?php

use App\Http\Controllers\Api\V1\Staff\StaffController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->prefix('staff')->group(function () {
    Route::get('/', [StaffController::class, 'index']);
    Route::post('/', [StaffController::class, 'store'])->middleware('role:admin,manager');
    Route::get('/schedule', [StaffController::class, 'schedule']);
    Route::post('/schedule', [StaffController::class, 'createSchedule'])->middleware('role:admin,manager');
    Route::get('/{id}', [StaffController::class, 'show'])->whereUuid('id');
    Route::put('/{id}', [StaffController::class, 'update'])->middleware('role:admin,manager')->whereUuid('id');
    Route::get('/{id}/performance', [StaffController::class, 'performance'])->whereUuid('id');
    Route::post('/clock-in', [StaffController::class, 'clockIn']);
    Route::post('/clock-out', [StaffController::class, 'clockOut']);
    Route::get('/{id}/commissions', [StaffController::class, 'commissions'])->whereUuid('id');
    Route::post('/{id}/leave', [StaffController::class, 'requestLeave'])->whereUuid('id');
});
