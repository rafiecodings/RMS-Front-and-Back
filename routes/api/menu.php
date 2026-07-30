<?php

use App\Http\Controllers\Api\V1\Menu\CategoryController;
use App\Http\Controllers\Api\V1\Menu\ComboController;
use App\Http\Controllers\Api\V1\Menu\ItemController;
use App\Http\Controllers\Api\V1\Menu\ModifierController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->prefix('menu')->group(function () {
    Route::prefix('categories')->group(function () {
        Route::get('/', [CategoryController::class, 'index']);
        Route::post('/', [CategoryController::class, 'store']);
        Route::get('/{id}', [CategoryController::class, 'show']);
        Route::put('/{id}', [CategoryController::class, 'update']);
        Route::delete('/{id}', [CategoryController::class, 'destroy']);
    });

    Route::prefix('items')->group(function () {
        Route::get('/', [ItemController::class, 'index']);
        Route::post('/', [ItemController::class, 'store']);
        Route::get('/{id}', [ItemController::class, 'show']);
        Route::put('/{id}', [ItemController::class, 'update']);
        Route::patch('/{id}/availability', [ItemController::class, 'toggleAvailability']);
        Route::post('/{id}/images', [ItemController::class, 'uploadImage']);
    });

    Route::prefix('modifiers')->group(function () {
        Route::get('/', [ModifierController::class, 'index']);
        Route::post('/', [ModifierController::class, 'store']);
        Route::get('/{id}', [ModifierController::class, 'show']);
        Route::put('/{id}', [ModifierController::class, 'update']);
        Route::delete('/{id}', [ModifierController::class, 'destroy']);
    });

    Route::prefix('combos')->group(function () {
        Route::get('/', [ComboController::class, 'index']);
        Route::post('/', [ComboController::class, 'store']);
        Route::get('/{id}', [ComboController::class, 'show']);
        Route::put('/{id}', [ComboController::class, 'update']);
        Route::delete('/{id}', [ComboController::class, 'destroy']);
    });
});
