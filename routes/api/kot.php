<?php

use App\Http\Controllers\Api\V1\KOT\KOTController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->prefix('kot')->group(function () {
    Route::get('/', [KOTController::class, 'index']);
    Route::get('/{id}', [KOTController::class, 'show'])->whereUuid('id');
    Route::patch('/{id}/status', [KOTController::class, 'updateStatus'])->whereUuid('id');
    Route::patch('/{id}/archive', [KOTController::class, 'archive'])->whereUuid('id');
    Route::post('/{id}/print', [KOTController::class, 'print'])->whereUuid('id');
    Route::post('/{id}/void', [KOTController::class, 'void'])->whereUuid('id');
    Route::post('/{id}/reprint', [KOTController::class, 'reprint'])->whereUuid('id');
    Route::get('/station/{stationId}', [KOTController::class, 'byStation'])->whereUuid('stationId');
});
