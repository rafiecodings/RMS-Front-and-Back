<?php

use App\Http\Controllers\Api\V1\Customer\CustomerController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->prefix('customers')->group(function () {
    Route::get('/', [CustomerController::class, 'index']);
    Route::post('/', [CustomerController::class, 'store']);
    Route::get('/{id}', [CustomerController::class, 'show']);
    Route::put('/{id}', [CustomerController::class, 'update']);
    Route::delete('/{id}', [CustomerController::class, 'destroy'])->middleware('role:admin,manager');
    // Frontend contract: DELETE /{id}/archive archives the customer
    // (is_active = false). Restoring is done via PUT /{id} with is_active=true.
    Route::delete('/{id}/archive', [CustomerController::class, 'archive'])->middleware('role:admin,manager');
    Route::get('/{id}/orders', [CustomerController::class, 'orders']);
    Route::get('/{id}/loyalty', [CustomerController::class, 'loyalty']);
});
