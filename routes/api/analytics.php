<?php

use App\Http\Controllers\Api\V1\Analytics\AnalyticsController;
use App\Http\Controllers\Api\V1\Analytics\ForecastController;
use App\Http\Controllers\Api\V1\Analytics\DemandForecastController;
use App\Http\Controllers\Api\V1\Analytics\InsightController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin,manager'])->prefix('analytics')->group(function () {
    Route::get('/revenue', [AnalyticsController::class, 'revenue']);
    Route::get('/sales', [AnalyticsController::class, 'sales']);
    Route::get('/peak-hours', [AnalyticsController::class, 'peakHours']);
    Route::get('/inventory', [AnalyticsController::class, 'inventory']);
    Route::get('/low-stock-projection', [AnalyticsController::class, 'lowStockProjection']);
    Route::get('/customers', [AnalyticsController::class, 'customers']);
    Route::get('/forecast/{menu_item_id}', [ForecastController::class, 'forecast'])->whereUuid('menu_item_id');
    // AI insights (Gemini via Laravel; aggregates only, graceful fallback).
    Route::post('/insights', [InsightController::class, 'insights']);
    // TimechoAI demand forecasting (Laravel aggregates history server-side).
    Route::get('/demand-forecast', [DemandForecastController::class, 'forecast']);
});

// Ingredient-scope forecast for inventory planning is additionally available
// to inventory staff (revenue fields are never included in that scope).
Route::middleware(['auth:sanctum', 'role:admin,manager,inventory_staff'])
    ->prefix('inventory')
    ->group(function () {
        Route::get('/demand-forecast', [\App\Http\Controllers\Api\V1\Analytics\DemandForecastController::class, 'forecast']);
    });
