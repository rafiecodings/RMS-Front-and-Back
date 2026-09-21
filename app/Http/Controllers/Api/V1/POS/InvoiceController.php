<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\POS;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Invoice::with(['order.customer', 'order.table']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($date = $request->input('date')) {
            $query->whereDate('created_at', $date);
        }

        if ($search = $request->input('search')) {
            $query->whereRaw('LOWER(invoice_number) LIKE ?', ["%".strtolower($search)."%"]);
        }

        $invoices = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        $data = $invoices->getCollection()->map(fn (Invoice $inv) => [
            'id' => $inv->id,
            'invoice_number' => $inv->invoice_number,
            'subtotal' => (float) $inv->subtotal,
            'tax_amount' => (float) $inv->tax_amount,
            'discount_amount' => (float) $inv->discount_amount,
            'service_charge' => (float) $inv->service_charge,
            'total' => (float) $inv->total,
            'amount_paid' => (float) $inv->amount_paid,
            'balance' => (float) $inv->balance,
            'status' => $inv->status,
            'order' => $inv->order ? [
                'id' => $inv->order->id,
                'order_number' => $inv->order->order_number,
                'table' => $inv->order->table ? [
                    'number' => $inv->order->table->number,
                ] : null,
                'customer' => $inv->order->customer ? [
                    'name' => $inv->order->customer->name,
                ] : null,
            ] : null,
            'created_at' => $inv->created_at?->toISOString(),
            'updated_at' => $inv->updated_at?->toISOString(),
        ]);

        return $this->success([
            'items' => $data,
            'pagination' => [
                'current_page' => $invoices->currentPage(),
                'last_page' => $invoices->lastPage(),
                'per_page' => $invoices->perPage(),
                'total' => $invoices->total(),
            ],
        ]);
    }

    public function generate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => 'required|string|exists:orders,id',
        ]);

        $order = Order::with('items')->find($validated['order_id']);

        if (!$order) {
            return $this->notFound('Order not found.');
        }

        $existingInvoice = Invoice::where('order_id', $order->id)->first();
        if ($existingInvoice) {
            return $this->error('Invoice already exists for this order.', 409);
        }

        $invoiceNumber = 'INV-' . \Illuminate\Support\Str::uuid();

        $invoice = Invoice::create([
            'invoice_number' => $invoiceNumber,
            'order_id' => $order->id,
            'subtotal' => $order->subtotal,
            'tax_amount' => $order->tax_amount,
            'discount_amount' => $order->discount_amount,
            'service_charge' => $order->service_charge,
            'total' => $order->total,
            'amount_paid' => 0,
            'balance' => $order->total,
            'status' => 'pending',
        ]);

        \App\Services\AuditLogger::record('invoice_generated', $invoice, [
            'description' => "Invoice {$invoice->invoice_number} generated for order {$order->order_number}",
        ]);

        return $this->created([
            'id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'subtotal' => (float) $invoice->subtotal,
            'tax_amount' => (float) $invoice->tax_amount,
            'discount_amount' => (float) $invoice->discount_amount,
            'service_charge' => (float) $invoice->service_charge,
            'total' => (float) $invoice->total,
            'amount_paid' => (float) $invoice->amount_paid,
            'balance' => (float) $invoice->balance,
            'status' => $invoice->status,
            'order_number' => $order->order_number,
            'created_at' => $invoice->created_at?->toISOString(),
            'updated_at' => $invoice->updated_at?->toISOString(),
        ], 'Invoice generated successfully.');
    }

    public function show(string $id): JsonResponse
    {
        $invoice = Invoice::with(['order.customer', 'order.table', 'order.items.menuItem', 'payments', 'refunds'])
            ->find($id);

        if (!$invoice) {
            return $this->notFound('Invoice not found.');
        }

        return $this->success([
            'id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'subtotal' => (float) $invoice->subtotal,
            'tax_amount' => (float) $invoice->tax_amount,
            'discount_amount' => (float) $invoice->discount_amount,
            'service_charge' => (float) $invoice->service_charge,
            'total' => (float) $invoice->total,
            'amount_paid' => (float) $invoice->amount_paid,
            'balance' => (float) $invoice->balance,
            'status' => $invoice->status,
            'order' => $invoice->order ? [
                'id' => $invoice->order->id,
                'order_number' => $invoice->order->order_number,
                'table' => $invoice->order->table ? [
                    'number' => $invoice->order->table->number,
                ] : null,
                'customer' => $invoice->order->customer ? [
                    'id' => $invoice->order->customer->id,
                    'name' => $invoice->order->customer->name,
                ] : null,
                'items' => $invoice->order->items->map(fn ($item) => [
                    'name' => $item->name,
                    'quantity' => $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'total_price' => (float) $item->total_price,
                ]),
            ] : null,
            'payments' => $invoice->payments->map(fn ($p) => [
                'id' => $p->id,
                'amount' => (float) $p->amount,
                'payment_method' => $p->payment_method,
                'reference_number' => $p->reference_number,
                'created_at' => $p->created_at?->toISOString(),
            ]),
            'refunds' => $invoice->refunds->map(fn ($r) => [
                'id' => $r->id,
                'amount' => (float) $r->amount,
                'reason' => $r->reason,
                'status' => $r->status,
                'created_at' => $r->created_at?->toISOString(),
            ]),
            'created_at' => $invoice->created_at?->toISOString(),
            'updated_at' => $invoice->updated_at?->toISOString(),
        ]);
    }

    public function receipt(string $id): JsonResponse
    {
        $invoice = Invoice::with(['order.customer', 'order.table', 'order.items.menuItem', 'payments.processor'])
            ->find($id);

        if (!$invoice) {
            return $this->notFound('Invoice not found.');
        }

        $restaurantSettings = \App\Models\RestaurantSetting::first();

        return $this->success([
            'restaurant' => $restaurantSettings ? [
                'name' => $restaurantSettings->name,
                'address' => $restaurantSettings->address,
                'phone' => $restaurantSettings->phone,
                'tax_id' => $restaurantSettings->tax_id,
                'receipt_header' => $restaurantSettings->receipt_header,
                'receipt_footer' => $restaurantSettings->receipt_footer,
                'currency' => $restaurantSettings->currency,
                'currency_symbol' => $restaurantSettings->currency_symbol,
            ] : null,
            'invoice' => [
                'invoice_number' => $invoice->invoice_number,
                'order_number' => $invoice->order?->order_number,
                'order_type' => $invoice->order?->order_type,
                'table' => $invoice->order?->table?->number,
                'customer_name' => $invoice->order?->customer?->name,
                'created_at' => $invoice->created_at?->toISOString(),
            ],
            'items' => $invoice->order?->items->map(fn ($item) => [
                'name' => $item->name,
                'quantity' => $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'total_price' => (float) $item->total_price,
            ]),
            'totals' => [
                'subtotal' => (float) $invoice->subtotal,
                'tax' => (float) $invoice->tax_amount,
                'vatable_sales' => round((float) $invoice->total - (float) $invoice->tax_amount, 2),
                'discount' => (float) $invoice->discount_amount,
                'applied_discount' => $invoice->order?->applied_discount_name ? [
                    'name' => $invoice->order->applied_discount_name,
                    'code' => $invoice->order->applied_discount_code,
                    'type' => $invoice->order->applied_discount_type,
                    'value' => (float) $invoice->order->applied_discount_value,
                ] : null,
                'service_charge' => (float) $invoice->service_charge,
                'total' => (float) $invoice->total,
                'paid' => (float) $invoice->amount_paid,
                'balance' => (float) $invoice->balance,
            ],
            'payments' => $invoice->payments->map(fn ($p) => [
                'method' => $p->payment_method,
                'amount' => (float) $p->amount,
                'reference' => $p->reference_number,
                'cashier' => $p->processor?->name,
                'change' => $p->payment_method === 'cash'
                    ? max(0, round((float) $p->amount - (float) $invoice->total, 2))
                    : 0,
            ]),
        ]);
    }
}
