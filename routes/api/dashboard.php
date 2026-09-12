<?php

use App\Http\Controllers\Api\V1\Dashboard\DashboardController;
use Illuminate\Support\Facades\Route;

// Role-aware summary is open to all operational RMS roles — the controller
// filters the payload server-side per role (never trust frontend hiding).
// The granular analytics endpoints stay admin/manager-only.
Route::middleware(['auth:sanctum'])->prefix('dashboard')->group(function () {
    Route::get('/summary', [DashboardController::class, 'summary'])
        ->middleware('role:admin,manager,waiter,cashier,kitchen_staff,inventory_staff');

    Route::middleware('role:admin,manager')->group(function () {
        Route::get('/revenue', [DashboardController::class, 'revenue']);
        Route::get('/orders', [DashboardController::class, 'orders']);
        Route::get('/tables', [DashboardController::class, 'tables']);
        Route::get('/alerts', [DashboardController::class, 'alerts']);
    });
});
