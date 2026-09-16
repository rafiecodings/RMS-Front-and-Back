<?php

use App\Http\Controllers\Api\V1\Auth\ChangePasswordController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\ProfileController;
use App\Http\Controllers\Api\V1\Auth\RefreshTokenController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [LoginController::class, 'login'])->middleware('throttle:login');
Route::post('/auth/logout', [LogoutController::class, 'logout'])->middleware(['auth:sanctum', 'active']);
Route::get('/auth/profile', [ProfileController::class, 'show'])->middleware(['auth:sanctum', 'active']);
Route::put('/auth/profile', [ProfileController::class, 'update'])->middleware(['auth:sanctum', 'active']);
Route::post('/auth/refresh', [RefreshTokenController::class, 'refresh'])->middleware(['auth:sanctum', 'active']);
Route::post('/auth/change-password', [ChangePasswordController::class, 'change'])->middleware(['auth:sanctum', 'active']);
