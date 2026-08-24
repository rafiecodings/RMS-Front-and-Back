<?php

use App\Http\Controllers\Api\V1\Inventory\IngredientController;
use App\Http\Controllers\Api\V1\Inventory\PurchaseOrderController;
use App\Http\Controllers\Api\V1\Inventory\RecipeController;
use App\Http\Controllers\Api\V1\Inventory\StockController;
use App\Http\Controllers\Api\V1\Inventory\SupplierController;
use App\Http\Controllers\Api\V1\Inventory\WastageController;
use Illuminate\Support\Facades\Route;

// Full inventory management: admin, manager, inventory_staff
Route::middleware(['auth:sanctum', 'role:admin,manager,inventory_staff'])->prefix('inventory')->group(function () {
    Route::prefix('ingredients')->group(function () {
        Route::get('/', [IngredientController::class, 'index']);
        Route::post('/', [IngredientController::class, 'store']);
        Route::get('/{id}', [IngredientController::class, 'show'])->whereUuid('id');
        Route::put('/{id}', [IngredientController::class, 'update'])->whereUuid('id');
        Route::delete('/{id}', [IngredientController::class, 'destroy'])->whereUuid('id');
    });

    Route::prefix('stock')->group(function () {
        Route::get('/', [StockController::class, 'index']);
        Route::post('/inward', [StockController::class, 'inward'])->middleware('role:admin,manager');
        Route::post('/outward', [StockController::class, 'outward'])->middleware('role:admin,manager');
        Route::post('/adjust', [StockController::class, 'adjust'])->middleware('role:admin,manager');
        Route::post('/transfer', [StockController::class, 'transfer'])->middleware('role:admin,manager');
    });

    Route::prefix('recipes')->middleware('role:admin,manager')->group(function () {
        Route::get('/', [RecipeController::class, 'index']);
        Route::post('/', [RecipeController::class, 'store']);
        Route::get('/{id}', [RecipeController::class, 'show'])->whereUuid('id');
        Route::put('/{id}', [RecipeController::class, 'update'])->whereUuid('id');
        Route::delete('/{id}', [RecipeController::class, 'destroy'])->whereUuid('id');
    });

    Route::prefix('suppliers')->group(function () {
        Route::get('/', [SupplierController::class, 'index']);
        Route::post('/', [SupplierController::class, 'store']);
        Route::get('/{id}', [SupplierController::class, 'show'])->whereUuid('id');
        Route::put('/{id}', [SupplierController::class, 'update'])->whereUuid('id');
        Route::delete('/{id}', [SupplierController::class, 'destroy'])->whereUuid('id');
    });

    Route::prefix('purchase-orders')->group(function () {
        Route::get('/', [PurchaseOrderController::class, 'index']);
        Route::post('/', [PurchaseOrderController::class, 'store']);
        Route::get('/{id}', [PurchaseOrderController::class, 'show'])->whereUuid('id');
        Route::put('/{id}', [PurchaseOrderController::class, 'update'])->whereUuid('id');
        Route::patch('/{id}/status', [PurchaseOrderController::class, 'updateStatus'])->whereUuid('id');
    });

    Route::prefix('wastage')->group(function () {
        Route::get('/', [WastageController::class, 'index']);
        Route::post('/', [WastageController::class, 'store'])->middleware('role:admin,manager');
    });

    Route::get('/reconciliation', [StockController::class, 'reconciliation'])->middleware('role:admin,manager');
});

// Kitchen staff read-only access to ingredients, stock, recipes, and expiry
Route::middleware(['auth:sanctum', 'role:admin,manager,inventory_staff,kitchen_staff'])->prefix('inventory')->group(function () {
    Route::get('/ingredients', [IngredientController::class, 'index']);
    Route::get('/ingredients/{id}', [IngredientController::class, 'show'])->whereUuid('id');
    Route::get('/stock', [StockController::class, 'index']);
    Route::get('/recipes', [RecipeController::class, 'index']);
    Route::get('/recipes/{id}', [RecipeController::class, 'show'])->whereUuid('id');
});
