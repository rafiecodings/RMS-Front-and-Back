<?php

use App\Http\Controllers\Api\V1\Table\TableController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->group(function () {
    Route::prefix('tables')->group(function () {
        Route::get('/', [TableController::class, 'index']);
        Route::get('/available', [TableController::class, 'available']);
        // Floor-plan mutations are restricted to managers; reads stay open to
        // operational roles (matches permissions matrix + frontend gating).
        Route::middleware('role:admin,manager')->group(function () {
            Route::post('/', [TableController::class, 'store']);
            Route::put('/{id}', [TableController::class, 'update'])->whereUuid('id');
            Route::patch('/{id}/status', [TableController::class, 'updateStatus'])->whereUuid('id');
            Route::delete('/{id}', [TableController::class, 'destroy'])->whereUuid('id');
            Route::post('/merge', [TableController::class, 'merge']);
            Route::post('/split', [TableController::class, 'split']);
            Route::post('/transfer', [TableController::class, 'transfer']);
        });
        Route::get('/{id}', [TableController::class, 'show'])->whereUuid('id');
    });
});