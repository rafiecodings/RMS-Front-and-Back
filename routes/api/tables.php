<?php

use App\Http\Controllers\Api\V1\Table\FloorPlanController;
use App\Http\Controllers\Api\V1\Table\TableController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->group(function () {
    Route::prefix('floor-plans')->group(function () {
        Route::get('/', [FloorPlanController::class, 'index']);
        Route::post('/', [FloorPlanController::class, 'store']);
        Route::get('/{id}', [FloorPlanController::class, 'show']);
        Route::put('/{id}', [FloorPlanController::class, 'update']);
        Route::delete('/{id}', [FloorPlanController::class, 'destroy']);
    });

    Route::prefix('tables')->group(function () {
        Route::get('/', [TableController::class, 'index']);
        Route::post('/', [TableController::class, 'store']);
        Route::get('/{id}', [TableController::class, 'show']);
        Route::put('/{id}', [TableController::class, 'update']);
        Route::patch('/{id}/status', [TableController::class, 'updateStatus']);
        Route::post('/merge', [TableController::class, 'merge']);
        Route::post('/split', [TableController::class, 'split']);
        Route::post('/transfer', [TableController::class, 'transfer']);
    });
});
