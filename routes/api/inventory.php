<?php

use App\Http\Controllers\Api\V1\Inventory\IngredientController;
use App\Http\Controllers\Api\V1\Inventory\PurchaseOrderController;
use App\Http\Controllers\Api\V1\Inventory\RecipeController;
use App\Http\Controllers\Api\V1\Inventory\StockController;
use App\Http\Controllers\Api\V1\Inventory\SupplierController;
use App\Http\Controllers\Api\V1\Inventory\WastageController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->prefix('inventory')->group(function () {
    Route::prefix('ingredients')->group(function () {
        Route::get('/', [IngredientController::class, 'index']);
        Route::post('/', [IngredientController::class, 'store']);
        Route::get('/{id}', [IngredientController::class, 'show']);
        Route::put('/{id}', [IngredientController::class, 'update']);
        Route::delete('/{id}', [IngredientController::class, 'destroy']);
    });

    Route::prefix('stock')->group(function () {
        Route::get('/', [StockController::class, 'index']);
        Route::post('/inward', [StockController::class, 'inward']);
        Route::post('/outward', [StockController::class, 'outward']);
        Route::post('/adjust', [StockController::class, 'adjust']);
        Route::post('/transfer', [StockController::class, 'transfer']);
    });

    Route::prefix('recipes')->group(function () {
        Route::get('/', [RecipeController::class, 'index']);
        Route::post('/', [RecipeController::class, 'store']);
        Route::get('/{id}', [RecipeController::class, 'show']);
        Route::put('/{id}', [RecipeController::class, 'update']);
        Route::delete('/{id}', [RecipeController::class, 'destroy']);
    });

    Route::prefix('suppliers')->group(function () {
        Route::get('/', [SupplierController::class, 'index']);
        Route::post('/', [SupplierController::class, 'store']);
        Route::get('/{id}', [SupplierController::class, 'show']);
        Route::put('/{id}', [SupplierController::class, 'update']);
        Route::delete('/{id}', [SupplierController::class, 'destroy']);
    });

    Route::prefix('purchase-orders')->group(function () {
        Route::get('/', [PurchaseOrderController::class, 'index']);
        Route::post('/', [PurchaseOrderController::class, 'store']);
        Route::get('/{id}', [PurchaseOrderController::class, 'show']);
        Route::put('/{id}', [PurchaseOrderController::class, 'update']);
        Route::patch('/{id}/status', [PurchaseOrderController::class, 'updateStatus']);
    });

    Route::prefix('wastage')->group(function () {
        Route::get('/', [WastageController::class, 'index']);
        Route::post('/', [WastageController::class, 'store']);
    });

    Route::get('/expiry', [StockController::class, 'expiringItems']);
    Route::get('/reconciliation', [StockController::class, 'reconciliation']);
});
