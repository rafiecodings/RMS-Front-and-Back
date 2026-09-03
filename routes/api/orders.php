<?php

use App\Http\Controllers\Api\V1\Order\OrderController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin,manager,waiter,cashier'])->prefix('orders')->group(function () {
    Route::get('/', [OrderController::class, 'index']);
    Route::post('/', [OrderController::class, 'store']);
    Route::get('/{id}', [OrderController::class, 'show']);
    Route::put('/{id}', [OrderController::class, 'update']);
    Route::patch('/{id}/status', [OrderController::class, 'updateStatus']);
    Route::patch('/{id}/archive', [OrderController::class, 'archive'])->middleware('role:admin,manager');
    Route::delete('/{id}/archive', [OrderController::class, 'unarchive'])->middleware('role:admin,manager');
    Route::post('/{id}/items', [OrderController::class, 'addItem']);
    Route::put('/{id}/items/{itemId}', [OrderController::class, 'updateItem']);
    Route::delete('/{id}/items/{itemId}', [OrderController::class, 'removeItem']);
    Route::post('/{id}/hold', [OrderController::class, 'hold']);
    Route::post('/{id}/recall', [OrderController::class, 'recall']);
    Route::post('/{id}/split', [OrderController::class, 'split']);
Route::post('/{id}/reorder', [OrderController::class, 'reorder']);
    Route::get('/{id}/timeline', [OrderController::class, 'timeline']);
    Route::post('/{id}/void', [OrderController::class, 'void'])->middleware('role:admin,manager');
    Route::post('/{id}/payments', [OrderController::class, 'pay'])->middleware('role:admin,manager,cashier');
});
