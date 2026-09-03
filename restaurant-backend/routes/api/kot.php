<?php

use App\Http\Controllers\Api\V1\KOT\KOTController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->prefix('kot')->group(function () {
    Route::get('/', [KOTController::class, 'index']);
    Route::get('/{id}', [KOTController::class, 'show']);
    Route::patch('/{id}/status', [KOTController::class, 'updateStatus'])->middleware('role:admin,manager,kitchen_staff');
    Route::patch('/{id}/archive', [KOTController::class, 'archive'])->middleware('role:admin,manager');
    Route::delete('/{id}/archive', [KOTController::class, 'unarchive'])->middleware('role:admin,manager');
    Route::post('/{id}/print', [KOTController::class, 'print']);
    Route::post('/{id}/void', [KOTController::class, 'void'])->middleware('role:admin,manager');
    Route::post('/{id}/reprint', [KOTController::class, 'reprint']);
    Route::get('/station/{stationId}', [KOTController::class, 'byStation']);
});
