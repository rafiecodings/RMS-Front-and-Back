<?php

use App\Http\Controllers\Api\V1\Menu\CategoryController;
use App\Http\Controllers\Api\V1\Menu\ComboController;
use App\Http\Controllers\Api\V1\Menu\ItemController;
use App\Http\Controllers\Api\V1\Menu\ModifierController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->prefix('menu')->group(function () {
    Route::prefix('categories')->group(function () {
        Route::get('/', [CategoryController::class, 'index']);
        Route::post('/', [CategoryController::class, 'store'])->middleware('role:admin,manager');
        Route::get('/{id}', [CategoryController::class, 'show'])->whereUuid('id');
        Route::put('/{id}', [CategoryController::class, 'update'])->middleware('role:admin,manager')->whereUuid('id');
        Route::delete('/{id}', [CategoryController::class, 'destroy'])->middleware('role:admin,manager')->whereUuid('id');
    });

    Route::prefix('items')->group(function () {
        Route::get('/', [ItemController::class, 'index']);
        Route::post('/', [ItemController::class, 'store'])->middleware('role:admin,manager');
        Route::get('/{id}', [ItemController::class, 'show'])->whereUuid('id');
        Route::put('/{id}', [ItemController::class, 'update'])->middleware('role:admin,manager')->whereUuid('id');
        Route::patch('/{id}/availability', [ItemController::class, 'toggleAvailability'])->middleware('role:admin,manager')->whereUuid('id');
        Route::post('/{id}/images', [ItemController::class, 'uploadImage'])->middleware('role:admin,manager')->whereUuid('id');
    });

    Route::prefix('modifiers')->group(function () {
        Route::get('/', [ModifierController::class, 'index']);
        Route::post('/', [ModifierController::class, 'store'])->middleware('role:admin,manager');
        Route::get('/{id}', [ModifierController::class, 'show'])->whereUuid('id');
        Route::put('/{id}', [ModifierController::class, 'update'])->middleware('role:admin,manager')->whereUuid('id');
        Route::delete('/{id}', [ModifierController::class, 'destroy'])->middleware('role:admin,manager')->whereUuid('id');
    });

    Route::prefix('combos')->group(function () {
        Route::get('/', [ComboController::class, 'index']);
        Route::post('/', [ComboController::class, 'store'])->middleware('role:admin,manager');
        Route::get('/{id}', [ComboController::class, 'show'])->whereUuid('id');
        Route::put('/{id}', [ComboController::class, 'update'])->middleware('role:admin,manager')->whereUuid('id');
        Route::delete('/{id}', [ComboController::class, 'destroy'])->middleware('role:admin,manager')->whereUuid('id');
    });
});
