<?php

use App\Http\Controllers\Api\V1\Analytics\AnalyticsController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin,manager'])->prefix('analytics')->group(function () {
    Route::get('/revenue', [AnalyticsController::class, 'revenue']);
    Route::get('/sales', [AnalyticsController::class, 'sales']);
    Route::get('/peak-hours', [AnalyticsController::class, 'peakHours']);
    Route::get('/inventory', [AnalyticsController::class, 'inventory']);
    Route::get('/customers', [AnalyticsController::class, 'customers']);
});
