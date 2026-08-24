<?php

use App\Http\Controllers\Api\V1\Dashboard\DashboardController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->prefix('dashboard')->group(function () {
    // Summary payload is filtered per-role server-side (financial sections
    // stripped for non-management roles).
    Route::get('/summary', [DashboardController::class, 'summary']);
    Route::get('/revenue', [DashboardController::class, 'revenue'])->middleware('role:admin,manager');
    Route::get('/orders', [DashboardController::class, 'orders']);
    Route::get('/tables', [DashboardController::class, 'tables']);
    Route::get('/alerts', [DashboardController::class, 'alerts']);
});
