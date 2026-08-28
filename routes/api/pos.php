<?php

use App\Http\Controllers\Api\V1\POS\DiscountController;
use App\Http\Controllers\Api\V1\POS\GiftCardController;
use App\Http\Controllers\Api\V1\POS\InvoiceController;
use App\Http\Controllers\Api\V1\POS\PaymentController;
use App\Http\Controllers\Api\V1\POS\CashRegisterController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin,manager,cashier'])->group(function () {
    Route::prefix('invoices')->group(function () {
        Route::get('/', [InvoiceController::class, 'index']);
        Route::post('/generate', [InvoiceController::class, 'generate']);
        Route::get('/{id}', [InvoiceController::class, 'show']);
        Route::get('/{id}/receipt', [InvoiceController::class, 'receipt']);
        // Frontend contract alias: delegates to the SAME refund implementation
        // as POST /payments/{invoiceId}/refund (no duplicated business logic).
        Route::post('/{invoiceId}/refund', [PaymentController::class, 'refund']);
    });

    Route::prefix('payments')->group(function () {
        // Literal segments before /{invoiceId} posts; no shadowing risk but
        // grouped here for readability.
        Route::get('/', [PaymentController::class, 'index']);
        Route::get('/stats', [PaymentController::class, 'stats']);
        Route::get('/refunds', [PaymentController::class, 'refunds']);
        Route::post('/{invoiceId}/pay', [PaymentController::class, 'pay']);
        Route::post('/{invoiceId}/split', [PaymentController::class, 'splitPayment']);
        Route::post('/{invoiceId}/refund', [PaymentController::class, 'refund']);
    });

    Route::middleware('role:admin,manager,cashier')->group(function () {
        Route::prefix('discounts')->group(function () {
            Route::get('/', [DiscountController::class, 'index']);
            Route::post('/', [DiscountController::class, 'store']);
            Route::get('/{id}', [DiscountController::class, 'show']);
            Route::put('/{id}', [DiscountController::class, 'update']);
            Route::delete('/{id}', [DiscountController::class, 'destroy']);
        });
    });

    Route::prefix('cash-register')->group(function () {
        Route::get('/sessions', [CashRegisterController::class, 'index']);
        Route::post('/open', [CashRegisterController::class, 'open']);
        Route::post('/close', [CashRegisterController::class, 'close']);
        Route::get('/x-report', [CashRegisterController::class, 'xReport']);
    });

    Route::prefix('gift-cards')->group(function () {
        Route::get('/', [GiftCardController::class, 'index']);
        Route::post('/', [GiftCardController::class, 'store']);
        Route::post('/redeem', [GiftCardController::class, 'redeem']);
    });
});
