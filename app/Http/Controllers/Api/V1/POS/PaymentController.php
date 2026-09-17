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
            'payment_method' => 'required|string|in:cash,card,e_wallet',
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
            'payments.*.payment_method' => 'required|string|in:cash,card,e_wallet',
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

        \App\Services\AuditLogger::record('refund_processed', $refund, [
            'description' => "Refund of ₱".number_format((float) $refund->amount, 2)
                ." processed for invoice {$invoice->invoice_number}: {$refund->reason}",
            'amount' => (float) $refund->amount,
        ]);

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

    /**
     * Payments listing (GET /payments).
     *
     * Frontend contract: PaginatedResponse<Payment> with filters
     * payment_method, date_from, date_to, invoice_id, search.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payment_method' => 'nullable|string|max:30',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'invoice_id' => 'nullable|uuid',
            'search' => 'nullable|string|max:100',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = Payment::with(['invoice.order', 'processor']);

        if ($method = $validated['payment_method'] ?? null) {
            $query->where('payment_method', $method);
        }

        if ($from = $validated['date_from'] ?? null) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $validated['date_to'] ?? null) {
            $query->whereDate('created_at', '<=', $to);
        }

        if ($invoiceId = $validated['invoice_id'] ?? null) {
            $query->where('invoice_id', $invoiceId);
        }

        if ($search = $validated['search'] ?? null) {
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(reference_number) LIKE ?', ["%".strtolower($search)."%"])
                    ->orWhere('id', $search);
            });
        }

        $payments = $query->orderByDesc('created_at')
            ->paginate($validated['per_page'] ?? 15);

        $data = $payments->getCollection()->map(fn (Payment $p) => [
            'id' => $p->id,
            'invoice_id' => $p->invoice_id,
            'amount' => (float) $p->amount,
            'payment_method' => $p->payment_method,
            'reference' => $p->reference_number,
            'processed_by_id' => $p->processed_by,
            'processed_by' => $p->processor ? [
                'id' => $p->processor->id,
                'name' => $p->processor->name,
            ] : null,
            'order_number' => $p->invoice?->order?->order_number,
            'processed_at' => $p->created_at?->toISOString(),
            'created_at' => $p->created_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'per_page' => $payments->perPage(),
                'total' => $payments->total(),
            ],
        ]);
    }

    /**
     * Billing stats (GET /payments/stats).
     *
     * Matches the frontend BillingStats type exactly.
     */
    public function stats(Request $request): JsonResponse
    {
        $from = $request->date('date_from');
        $to = $request->date('date_to');

        $ordersQuery = \App\Models\Order::where('status', 'completed');
        $paymentsQuery = Payment::query();
        $refundsQuery = Refund::query();

        if ($from) {
            $ordersQuery->whereDate('created_at', '>=', $from->toDateString());
            $paymentsQuery->whereDate('created_at', '>=', $from->toDateString());
            $refundsQuery->whereDate('created_at', '>=', $from->toDateString());
        }
        if ($to) {
            $ordersQuery->whereDate('created_at', '<=', $to->toDateString());
            $paymentsQuery->whereDate('created_at', '<=', $to->toDateString());
            $refundsQuery->whereDate('created_at', '<=', $to->toDateString());
        }

        $totalRevenue = (float) (clone $ordersQuery)->sum('total');
        $ordersCount = (clone $ordersQuery)->count();
        $totalRefunds = (float) (clone $refundsQuery)->sum('amount');

        $outstandingAmount = (float) Invoice::whereIn('status', ['unpaid', 'partial'])
            ->sum('balance');

        $breakdown = (clone $paymentsQuery)
            ->selectRaw('payment_method as method, SUM(amount) as amount, COUNT(*) as count')
            ->groupBy('payment_method')
            ->get()
            ->map(fn ($row) => [
                'method' => $row->method,
                'amount' => round((float) $row->amount, 2),
                'count' => (int) $row->count,
            ]);

        return $this->success([
            'total_revenue' => round($totalRevenue, 2),
            'outstanding_amount' => round($outstandingAmount, 2),
            'total_refunds' => round($totalRefunds, 2),
            'net_revenue' => round($totalRevenue - $totalRefunds, 2),
            'orders_count' => $ordersCount,
            'avg_order_value' => $ordersCount > 0 ? round($totalRevenue / $ordersCount, 2) : 0.0,
            'payment_method_breakdown' => $breakdown,
        ]);
    }

    /**
     * Refunds listing (GET /payments/refunds).
     *
     * Maps the refunds table onto the frontend Refund contract. `search` is
     * used by useRefund(id) to look a refund up by id prefix.
     */
    public function refunds(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'nullable|string|in:pending,approved,rejected',
            'search' => 'nullable|string|max:64',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = Refund::with(['payment.invoice.order', 'processor']);

        if ($status = $validated['status'] ?? null) {
            $query->where('status', $status);
        }

        if ($search = $validated['search'] ?? null) {
            $query->where('id', 'like', "{$search}%");
        }

        $refunds = $query->orderByDesc('created_at')
            ->paginate($validated['per_page'] ?? 15);

        $data = $refunds->getCollection()->map(function (Refund $r) {
            $payment = $r->payment;
            $invoice = $payment?->invoice;

            return [
                'id' => $r->id,
                'refund_number' => 'REF-'.strtoupper(substr($r->id, 0, 8)),
                'invoice_id' => $invoice?->id ?? $payment?->invoice_id,
                'order_number' => $invoice?->order?->order_number,
                'type' => $payment && (float) $r->amount >= (float) $payment->amount ? 'full' : 'partial',
                'status' => $r->status,
                'reason' => $r->reason,
                'total_amount' => (float) $r->amount,
                'processed_by' => $r->processor ? [
                    'id' => $r->processor->id,
                    'name' => $r->processor->name,
                ] : null,
                'processed_at' => $r->updated_at?->toISOString(),
                'created_at' => $r->created_at?->toISOString(),
            ];
        });

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $refunds->currentPage(),
                'last_page' => $refunds->lastPage(),
                'per_page' => $refunds->perPage(),
                'total' => $refunds->total(),
            ],
        ]);
    }
}
