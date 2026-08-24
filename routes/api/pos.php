<?php

use App\Http\Controllers\Api\V1\POS\CashRegisterController;
use App\Http\Controllers\Api\V1\POS\DiscountController;
use App\Http\Controllers\Api\V1\POS\GiftCardController;
use App\Http\Controllers\Api\V1\POS\InvoiceController;
use App\Http\Controllers\Api\V1\POS\PaymentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin,manager,cashier'])->group(function () {
    Route::prefix('invoices')->group(function () {
        Route::get('/', [InvoiceController::class, 'index']);
        Route::post('/generate', [InvoiceController::class, 'generate']);
        Route::get('/{id}', [InvoiceController::class, 'show'])->whereUuid('id');
        Route::get('/{id}/receipt', [InvoiceController::class, 'receipt'])->whereUuid('id');
    });

    Route::prefix('payments')->group(function () {
        // Read-only history/listings for the Billing module.
        Route::get('/', [PaymentController::class, 'index']);
        Route::get('/refunds', [PaymentController::class, 'refundsIndex']);
        Route::get('/stats', [PaymentController::class, 'stats']);
        Route::post('/{invoiceId}/pay', [PaymentController::class, 'pay'])->whereUuid('invoiceId');
        Route::post('/{invoiceId}/split', [PaymentController::class, 'splitPayment'])->whereUuid('invoiceId');
        Route::post('/{invoiceId}/refund', [PaymentController::class, 'refund'])->whereUuid('invoiceId');
    });

    Route::middleware('role:admin,manager,cashier')->group(function () {
        Route::prefix('discounts')->group(function () {
            Route::get('/', [DiscountController::class, 'index']);
            Route::post('/', [DiscountController::class, 'store']);
            Route::get('/{id}', [DiscountController::class, 'show'])->whereUuid('id');
            Route::put('/{id}', [DiscountController::class, 'update'])->whereUuid('id');
            Route::delete('/{id}', [DiscountController::class, 'destroy'])->whereUuid('id');
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
