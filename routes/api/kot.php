<?php

use App\Http\Controllers\Api\V1\KOT\KOTController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->prefix('kot')->group(function () {
    Route::get('/', [KOTController::class, 'index']);
    Route::get('/{id}', [KOTController::class, 'show']);
    Route::patch('/{id}/status', [KOTController::class, 'updateStatus']);
    Route::post('/{id}/print', [KOTController::class, 'print']);
    Route::post('/{id}/void', [KOTController::class, 'void']);
    Route::post('/{id}/reprint', [KOTController::class, 'reprint']);
    Route::get('/station/{stationId}', [KOTController::class, 'byStation']);
});
