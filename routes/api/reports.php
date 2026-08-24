<?php

use App\Http\Controllers\Api\V1\Reports\ReportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin,manager'])->prefix('reports')->group(function () {
    Route::get('/revenue', [ReportController::class, 'revenue']);
    Route::get('/sales', [ReportController::class, 'sales']);
    Route::get('/menu-performance', [ReportController::class, 'menuPerformance']);
    Route::get('/customer-analytics', [ReportController::class, 'customerAnalytics']);
    Route::get('/inventory', [ReportController::class, 'inventory']);
    Route::get('/staff', [ReportController::class, 'staff']);
    Route::get('/tax', [ReportController::class, 'tax']);
    Route::post('/custom', [ReportController::class, 'custom']);
    Route::post('/export', [ReportController::class, 'export']);
});
