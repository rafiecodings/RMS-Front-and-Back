<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\POS;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Refund;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    public function pay(Request $request, string $invoiceId): JsonResponse
    {
        $invoice = Invoice::find($invoiceId);

        if (!$invoice) {
            return $this->notFound('Invoice not found.');
        }

        if ($invoice->status === 'paid') {
            return $this->error('Invoice is already fully paid.', 409);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|in:cash,card,bank_transfer,gift_card,loyalty_points',
            'reference_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validated['amount'] > $invoice->balance) {
            return $this->error('Payment amount exceeds remaining balance.', 422);
        }

        $payment = DB::transaction(function () use ($validated, $invoice, $request) {
            $payment = Payment::create([
                'invoice_id' => $invoice->id,
                'amount' => $validated['amount'],
                'payment_method' => $validated['payment_method'],
                'reference_number' => $validated['reference_number'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'processed_by' => $request->user()->id,
            ]);

            $newAmountPaid = (float) $invoice->amount_paid + $validated['amount'];
            $newBalance = (float) $invoice->total - $newAmountPaid;

            $invoice->update([
                'amount_paid' => $newAmountPaid,
                'balance' => max(0, $newBalance),
                'status' => $newBalance <= 0 ? 'paid' : 'partial',
            ]);

            return $payment;
        });

        return $this->created([
            'id' => $payment->id,
            'amount' => (float) $payment->amount,
            'payment_method' => $payment->payment_method,
            'reference_number' => $payment->reference_number,
            'invoice' => [
                'id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'amount_paid' => (float) $invoice->amount_paid,
                'balance' => (float) $invoice->balance,
                'status' => $invoice->status,
            ],
            'created_at' => $payment->created_at?->toISOString(),
        ], 'Payment processed successfully.');
    }

    public function splitPayment(Request $request, string $invoiceId): JsonResponse
    {
        $invoice = Invoice::find($invoiceId);

        if (!$invoice) {
            return $this->notFound('Invoice not found.');
        }

        if ($invoice->status === 'paid') {
            return $this->error('Invoice is already fully paid.', 409);
        }

        $validated = $request->validate([
            'payments' => 'required|array|min:2',
            'payments.*.amount' => 'required|numeric|min:0.01',
            'payments.*.payment_method' => 'required|string|in:cash,card,bank_transfer,gift_card,loyalty_points',
            'payments.*.reference_number' => 'nullable|string|max:255',
        ]);

        $totalSplit = array_sum(array_column($validated['payments'], 'amount'));

        if (abs($totalSplit - (float) $invoice->balance) > 0.01) {
            return $this->error('Split payment total must equal remaining balance.', 422);
        }

        $payments = DB::transaction(function () use ($validated, $invoice, $request) {
            $payments = [];
            foreach ($validated['payments'] as $payData) {
                $payments[] = Payment::create([
                    'invoice_id' => $invoice->id,
                    'amount' => $payData['amount'],
                    'payment_method' => $payData['payment_method'],
                    'reference_number' => $payData['reference_number'] ?? null,
                    'processed_by' => $request->user()->id,
                ]);
            }

            $invoice->update([
                'amount_paid' => (float) $invoice->total,
                'balance' => 0,
                'status' => 'paid',
            ]);

            return $payments;
        });

        return $this->created([
            'payments' => array_map(fn ($p) => [
                'id' => $p->id,
                'amount' => (float) $p->amount,
                'payment_method' => $p->payment_method,
            ], $payments),
            'invoice' => [
                'id' => $invoice->id,
                'amount_paid' => (float) $invoice->amount_paid,
                'balance' => (float) $invoice->balance,
                'status' => $invoice->status,
            ],
        ], 'Split payment processed successfully.');
    }

    public function refund(Request $request, string $invoiceId): JsonResponse
    {
        $invoice = Invoice::find($invoiceId);

        if (!$invoice) {
            return $this->notFound('Invoice not found.');
        }

        $validated = $request->validate([
            'payment_id' => 'required|string|exists:payments,id',
            'amount' => 'required|numeric|min:0.01',
            'reason' => 'required|string|max:1000',
        ]);

        $payment = Payment::find($validated['payment_id']);

        if ($payment->invoice_id !== $invoiceId) {
            return $this->error('Payment does not belong to this invoice.', 422);
        }

        $totalRefunded = Refund::where('payment_id', $payment->id)
            ->where('status', 'approved')
            ->sum('amount');

        if ($validated['amount'] > ((float) $payment->amount - (float) $totalRefunded)) {
            return $this->error('Refund amount exceeds refundable amount.', 422);
        }

        $refund = DB::transaction(function () use ($validated, $payment, $invoice, $request) {
            $refund = Refund::create([
                'payment_id' => $payment->id,
                'amount' => $validated['amount'],
                'reason' => $validated['reason'],
                'status' => 'approved',
                'processed_by' => $request->user()->id,
            ]);

            $newAmountPaid = (float) $invoice->amount_paid - $validated['amount'];
            $newBalance = (float) $invoice->total - $newAmountPaid;

            $invoice->update([
                'amount_paid' => max(0, $newAmountPaid),
                'balance' => max(0, $newBalance),
                'status' => $newAmountPaid <= 0 ? 'refunded' : 'partial',
            ]);

            return $refund;
        });

        return $this->created([
            'id' => $refund->id,
            'amount' => (float) $refund->amount,
            'reason' => $refund->reason,
            'status' => $refund->status,
            'invoice' => [
                'id' => $invoice->id,
                'amount_paid' => (float) $invoice->amount_paid,
                'balance' => (float) $invoice->balance,
                'status' => $invoice->status,
            ],
            'created_at' => $refund->created_at?->toISOString(),
        ], 'Refund processed successfully.');
    }
}
