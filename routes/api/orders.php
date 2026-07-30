<?php

use App\Http\Controllers\Api\V1\Order\OrderController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->prefix('orders')->group(function () {
    Route::get('/', [OrderController::class, 'index']);
    Route::post('/', [OrderController::class, 'store']);
    Route::get('/{id}', [OrderController::class, 'show']);
    Route::put('/{id}', [OrderController::class, 'update']);
    Route::patch('/{id}/status', [OrderController::class, 'updateStatus']);
    Route::post('/{id}/items', [OrderController::class, 'addItem']);
    Route::put('/{id}/items/{itemId}', [OrderController::class, 'updateItem']);
    Route::delete('/{id}/items/{itemId}', [OrderController::class, 'removeItem']);
    Route::post('/{id}/hold', [OrderController::class, 'hold']);
    Route::post('/{id}/recall', [OrderController::class, 'recall']);
    Route::post('/{id}/split', [OrderController::class, 'split']);
    Route::post('/{id}/void', [OrderController::class, 'void']);
    Route::post('/{id}/payments', [OrderController::class, 'pay']);
    Route::get('/{id}/timeline', [OrderController::class, 'timeline']);
    Route::post('/{id}/reorder', [OrderController::class, 'reorder']);
});
