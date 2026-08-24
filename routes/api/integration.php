<?php

use App\Http\Controllers\Api\V1\Integration\IntegrationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->prefix('integration')->group(function () {
    Route::get('/status', [IntegrationController::class, 'status']);
    Route::post('/webhooks', [IntegrationController::class, 'storeWebhook'])->middleware('role:admin,manager');
    Route::get('/webhooks', [IntegrationController::class, 'listWebhooks']);
    Route::delete('/webhooks/{id}', [IntegrationController::class, 'deleteWebhook'])->whereUuid('id')->middleware('role:admin,manager');
    Route::get('/events', [IntegrationController::class, 'listEvents']);
});
