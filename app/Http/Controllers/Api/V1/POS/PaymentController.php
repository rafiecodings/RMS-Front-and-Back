<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\POS;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Refund;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    /**
     * Global payment history across all invoices/orders.
     * Powers the Billing > Payment History page (read-only listing; the
     * canonical write path remains POST /invoices/{id}/pay).
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'payment_method' => 'nullable|string|in:cash,card,bank_transfer,gift_card,loyalty_points',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'search' => 'nullable|string|max:100',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = Payment::query()->with(['invoice.order', 'processor']);

        if ($method = $request->input('payment_method')) {
            $query->where('payment_method', $method);
        }

        if ($from = $request->input('date_from')) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $request->input('date_to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('reference_number', 'ilike', "%{$search}%")
                    ->orWhereHas('invoice.order', fn ($oq) => $oq->where('order_number', 'ilike', "%{$search}%"));
            });
        }

        $payments = $query->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 15));

        return $this->success([
            'items' => $payments->getCollection()->map(fn (Payment $p) => $this->formatPayment($p)),
            'pagination' => [
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'per_page' => $payments->perPage(),
                'total' => $payments->total(),
            ],
        ]);
    }

    /**
     * Global refund history. Read-only listing of refunds created via
     * POST /invoices/{id}/refund.
     */
    public function refundsIndex(Request $request): JsonResponse
    {
        $request->validate([
            'status' => 'nullable|string|in:pending,approved,completed,rejected',
            'search' => 'nullable|string|max:100',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = Refund::query()->with(['payment.invoice.order', 'processor']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('reason', 'ilike', "%{$search}%")
                    ->orWhereHas('payment.invoice.order', fn ($oq) => $oq->where('order_number', 'ilike', "%{$search}%"));
            });
        }

        $refunds = $query->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 15));

        $data = $refunds->getCollection()->map(function (Refund $r) {
            $payment = $r->payment;
            $invoice = $payment?->invoice;
            $order = $invoice?->order;

            return [
                'id' => $r->id,
                'refund_number' => 'REF-'.substr($r->id, 0, 8),
                'invoice_id' => $invoice?->id,
                'invoice_number' => $invoice?->invoice_number,
                'order_number' => $order?->order_number,
                // Derived: a refund equal to the full payment is "full".
                'type' => $payment && (float) $r->amount >= (float) $payment->amount ? 'full' : 'partial',
                'status' => $r->status,
                'reason' => $r->reason,
                'amount' => (float) $r->amount,
                'processed_by' => $r->processor ? [
                    'id' => $r->processor->id,
                    'name' => $r->processor->name,
                ] : null,
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

    /**
     * Aggregated billing figures for the Billing landing page cards.
     */
    public function stats(Request $request): JsonResponse
    {
        $paidInvoices = Invoice::whereIn('status', ['paid', 'partial']);

        $totalRevenue = (float) (clone $paidInvoices)->sum('amount_paid');
        $outstanding = (float) Invoice::whereIn('status', ['unpaid', 'partial'])->sum('balance');
        $totalRefunds = (float) Refund::where('status', 'approved')->sum('amount');
        $ordersCount = (int) Order::whereNotIn('status', ['cancelled'])->count();

        $methodBreakdown = Payment::query()
            ->selectRaw('payment_method, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('payment_method')
            ->get()
            ->map(fn ($row) => [
                'method' => $row->payment_method,
                'amount' => (float) $row->total,
                'count' => (int) $row->count,
            ]);

        return $this->success([
            'total_revenue' => $totalRevenue,
            'outstanding_amount' => $outstanding,
            'total_refunds' => $totalRefunds,
            'net_revenue' => round($totalRevenue - $totalRefunds, 2),
            'orders_count' => $ordersCount,
            'avg_order_value' => $ordersCount > 0
                ? round($totalRevenue / max($ordersCount, 1), 2)
                : 0.0,
            'payment_method_breakdown' => $methodBreakdown,
        ]);
    }

    private function formatPayment(Payment $p): array
    {
        return [
            'id' => $p->id,
            'invoice_id' => $p->invoice_id,
            'order_number' => $p->invoice?->order?->order_number,
            'payment_method' => $p->payment_method,
            'amount' => (float) $p->amount,
            'reference' => $p->reference_number,
            'notes' => $p->notes,
            'processed_by' => $p->processor ? [
                'id' => $p->processor->id,
                'name' => $p->processor->name,
            ] : null,
            'processed_at' => $p->created_at?->toISOString(),
            'created_at' => $p->created_at?->toISOString(),
        ];
    }

    public function pay(Request $request, string $invoiceId): JsonResponse
    {
        $invoice = Invoice::find($invoiceId);

        if (! $invoice) {
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

            $invoiceStatus = $newBalance <= 0 ? 'paid' : 'partial';
            $invoice->update([
                'amount_paid' => $newAmountPaid,
                'balance' => max(0, $newBalance),
                'status' => $invoiceStatus,
            ]);

            $orderPaymentStatus = $newBalance <= 0 ? 'paid' : 'partial';
            $orderUpdate = ['payment_status' => $orderPaymentStatus];
            if ($newBalance <= 0) {
                $orderUpdate['payment_method'] = $validated['payment_method'];
            }

            if ($invoice->order_id) {
                Order::where('id', $invoice->order_id)->update($orderUpdate);
            }

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

        if (! $invoice) {
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
            $paymentMethod = $validated['payments'][0]['payment_method'] ?? 'cash';
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

            if ($invoice->order_id) {
                Order::where('id', $invoice->order_id)->update([
                    'payment_status' => 'paid',
                    'payment_method' => $paymentMethod,
                ]);
            }

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

        if (! $invoice) {
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

            $invoiceStatus = $newAmountPaid <= 0 ? 'refunded' : 'partial';
            $invoice->update([
                'amount_paid' => max(0, $newAmountPaid),
                'balance' => max(0, $newBalance),
                'status' => $invoiceStatus,
            ]);

            if ($invoice->order_id) {
                Order::where('id', $invoice->order_id)->update([
                    'payment_status' => $newAmountPaid <= 0 ? 'refunded' : 'partial',
                ]);
            }

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
