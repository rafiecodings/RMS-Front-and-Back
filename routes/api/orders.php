<?php

use App\Http\Controllers\Api\V1\Order\OrderController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin,manager,waiter,cashier,kitchen_staff'])->prefix('orders')->group(function () {
    Route::get('/', [OrderController::class, 'index']);
    Route::post('/', [OrderController::class, 'store']);
    Route::get('/{id}', [OrderController::class, 'show'])->whereUuid('id');
    Route::put('/{id}', [OrderController::class, 'update'])->whereUuid('id');
    Route::patch('/{id}/status', [OrderController::class, 'updateStatus'])->whereUuid('id');
    Route::post('/{id}/items', [OrderController::class, 'addItem'])->whereUuid('id');
    Route::put('/{id}/items/{itemId}', [OrderController::class, 'updateItem'])->whereUuid('id')->whereUuid('itemId');
    Route::delete('/{id}/items/{itemId}', [OrderController::class, 'removeItem'])->whereUuid('id')->whereUuid('itemId');
    Route::post('/{id}/reorder', [OrderController::class, 'reorder'])->whereUuid('id');
    Route::get('/{id}/timeline', [OrderController::class, 'timeline'])->whereUuid('id');
    Route::middleware('role:admin,manager,cashier')->group(function () {
        Route::post('/{id}/payments', [OrderController::class, 'pay'])->whereUuid('id');
        Route::patch('/{id}/archive', [OrderController::class, 'archive'])->whereUuid('id');
    });
});

