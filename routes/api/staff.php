<?php

use App\Http\Controllers\Api\V1\Staff\StaffController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->prefix('staff')->group(function () {
    Route::get('/', [StaffController::class, 'index']);
    Route::get('/me', [StaffController::class, 'me']);
    Route::post('/', [StaffController::class, 'store'])->middleware('role:admin,manager');
    Route::get('/schedule', [StaffController::class, 'schedule']);
    Route::post('/schedule', [StaffController::class, 'createSchedule'])->middleware('role:admin,manager');
    Route::put('/schedule/{id}', [StaffController::class, 'updateSchedule'])->middleware('role:admin,manager')->whereUuid('id');
    Route::delete('/schedule/{id}', [StaffController::class, 'destroySchedule'])->middleware('role:admin,manager')->whereUuid('id');
    Route::get('/shifts', [StaffController::class, 'shifts']);
    Route::get('/attendance', [StaffController::class, 'attendance'])->middleware('role:admin,manager');
    Route::post('/attendance/{id}/close', [StaffController::class, 'closeAttendance'])->middleware('role:admin,manager')->whereUuid('id');
    // Employees aliases: same data layer / controller as /staff (no second table).
    Route::get('/employees', [StaffController::class, 'index']);
    Route::post('/employees', [StaffController::class, 'store'])->middleware('role:admin,manager');
    Route::get('/employees/{id}', [StaffController::class, 'show']);
    Route::put('/employees/{id}', [StaffController::class, 'update'])->middleware('role:admin,manager');
    Route::delete('/employees/{id}', [StaffController::class, 'destroy'])->middleware('role:admin,manager');
    Route::get('/{id}', [StaffController::class, 'show'])->whereUuid('id');
    Route::put('/{id}', [StaffController::class, 'update'])->middleware('role:admin,manager')->whereUuid('id');
    Route::get('/{id}/performance', [StaffController::class, 'performance'])->whereUuid('id');
    Route::post('/clock-in', [StaffController::class, 'clockIn']);
    Route::post('/clock-out', [StaffController::class, 'clockOut']);
    Route::get('/{id}/commissions', [StaffController::class, 'commissions'])->whereUuid('id');
    Route::get('/leave-requests', [StaffController::class, 'leaveIndex']);
    Route::post('/{id}/leave', [StaffController::class, 'requestLeave'])->whereUuid('id');
    Route::post('/leave-requests/{id}/approve', [StaffController::class, 'approveLeave'])->middleware('role:admin,manager')->whereUuid('id');
    Route::post('/leave-requests/{id}/reject', [StaffController::class, 'rejectLeave'])->middleware('role:admin,manager')->whereUuid('id');
    Route::post('/leave-requests/{id}/cancel', [StaffController::class, 'cancelLeave'])->whereUuid('id');
});
