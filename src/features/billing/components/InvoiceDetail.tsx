"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Printer, RotateCcw } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import type { Invoice } from "../types";

interface InvoiceDetailProps {
  invoice: Invoice;
  onPrint: () => void;
  onRefund: () => void;
}

export function InvoiceDetail({
  invoice,
  onPrint,
  onRefund,
}: InvoiceDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" render={<Link href="/billing/invoices" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">
              Invoice #{invoice.invoice_number}
            </h2>
            <p className="text-xs text-muted-foreground">
              Created {formatDateTime(invoice.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PaymentStatusBadge status={invoice.payment_status} />
          <Badge variant="secondary" className="capitalize">
            {invoice.order_type.replace("_", " ")}
          </Badge>
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          {invoice.payment_status !== "refunded" &&
            invoice.balance <= 0 && (
              <Button variant="outline" size="sm" onClick={onRefund}>
                <RotateCcw className="h-4 w-4 mr-1" /> Refund
              </Button>
            )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border">
            <div className="border-b bg-muted/50 px-3 py-2">
              <h3 className="text-sm font-semibold">Items</h3>
            </div>
            <div className="divide-y">
              {invoice.items.map((item) => {
                const modifierTotal =
                  item.modifiers?.reduce((m, mod) => m + mod.price, 0) ?? 0;
                const lineTotal =
                  (item.unit_price + modifierTotal) * item.quantity;
                return (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {item.quantity}× {item.menu_item_name}
                        {item.variant && (
                          <span className="text-muted-foreground ml-1">
                            ({item.variant})
                          </span>
                        )}
                      </p>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {item.modifiers.map((m) => m.name).join(", ")}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-medium shrink-0 ml-4">
                      {formatCurrency(lineTotal)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {invoice.payments.length > 0 && (
            <div className="rounded-lg border">
              <div className="border-b bg-muted/50 px-3 py-2">
                <h3 className="text-sm font-semibold">Payments</h3>
              </div>
              <div className="divide-y">
                {invoice.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2.5">
                    <div>
                      <p className="text-sm capitalize">
                        {p.payment_method.replace("_", " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(p.processed_at)}
                        {p.reference && ` • Ref: ${p.reference}`}
                      </p>
                    </div>
                    <span className="text-sm font-medium">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Discount</span>
                  <span>-{formatCurrency(invoice.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT (12%)</span>
                <span>{formatCurrency(invoice.tax_amount)}</span>
              </div>
              {invoice.service_charge > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Charge</span>
                  <span>{formatCurrency(invoice.service_charge)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <h3 className="text-sm font-semibold">Payment Status</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paid</span>
              <span className="font-medium">
                {formatCurrency(invoice.amount_paid)}
              </span>
            </div>
            {invoice.balance > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Balance Due</span>
                <span className="font-bold text-destructive">
                  {formatCurrency(invoice.balance)}
                </span>
              </div>
            )}
          </div>

          {(invoice.customer || invoice.table) && (
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="text-sm font-semibold">Details</h3>
              {invoice.customer && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Customer</span>
                  <span>{invoice.customer.name}</span>
                </div>
              )}
              {invoice.table && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Table</span>
                  <span>T{invoice.table.number}</span>
                </div>
              )}
              {invoice.placed_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Placed</span>
                  <span>
                    {formatDateTime(invoice.placed_at)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
