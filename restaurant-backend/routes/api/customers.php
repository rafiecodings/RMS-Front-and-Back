<?php

use App\Http\Controllers\Api\V1\Customer\CustomerController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum','active'])->prefix('customers')->group(function () {
    Route::middleware('role:admin,manager,waiter,cashier')->group(function () {
        Route::get('/', [CustomerController::class, 'index']);
        Route::get('/{id}', [CustomerController::class, 'show'])->whereUuid('id');
        Route::get('/{id}/orders', [CustomerController::class, 'orders'])->whereUuid('id');
        Route::get('/{id}/reservations', [CustomerController::class, 'reservations'])->whereUuid('id');
        Route::get('/{id}/loyalty', [CustomerController::class, 'loyalty'])->whereUuid('id');
    });

    Route::middleware('role:admin,manager')->group(function () {
        Route::post('/', [CustomerController::class, 'store']);
        Route::put('/{id}', [CustomerController::class, 'update'])->whereUuid('id');
        Route::delete('/{id}', [CustomerController::class, 'destroy'])->whereUuid('id');
        Route::delete('/{id}/archive', [CustomerController::class, 'archive'])->whereUuid('id');
    });
});
