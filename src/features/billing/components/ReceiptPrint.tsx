"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Invoice, Refund } from "../types";

interface ReceiptPrintProps {
  invoice: Invoice;
  refunds?: Refund[];
  showPrintButton?: boolean;
}

export function ReceiptPrint({
  invoice,
  refunds,
  showPrintButton = true,
}: ReceiptPrintProps) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  function handlePrint() {
    window.print();
  }

  return (
    <div className="rounded-lg border bg-card">
      {showPrintButton && (
        <div className="flex justify-end border-b p-3 print:hidden">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
        </div>
      )}

      <div className="p-6 print:p-4">
        <div className="mx-auto max-w-md space-y-4 text-sm print:text-xs">
          <div className="text-center">
            <p className="text-lg font-bold print:text-base">
              Restaurant Management System
            </p>
            <p className="text-xs text-muted-foreground">
              {dateStr} {timeStr}
            </p>
          </div>

          <Separator className="print:bg-gray-300" />

          <div className="flex justify-between">
            <span className="text-muted-foreground">Invoice #</span>
            <span className="font-medium">{invoice.invoice_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span className="capitalize">
              {invoice.order_type.replace("_", " ")}
            </span>
          </div>
          {invoice.customer && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span>{invoice.customer.name}</span>
            </div>
          )}
          {invoice.table && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Table</span>
              <span>T{invoice.table.number}</span>
            </div>
          )}

          <Separator className="print:bg-gray-300" />

          <div className="space-y-1.5">
            {invoice.items.map((item) => {
              const modifierTotal =
                item.modifiers?.reduce((m, mod) => m + mod.price, 0) ?? 0;
              const lineTotal =
                (item.unit_price + modifierTotal) * item.quantity;
              return (
                <div key={item.id} className="flex justify-between">
                  <span className="flex-1">
                    {item.quantity}× {item.menu_item_name}
                    {item.variant && ` (${item.variant})`}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(lineTotal)}
                  </span>
                </div>
              );
            })}
          </div>

          <Separator className="print:bg-gray-300" />

          <div className="space-y-1">
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
            <Separator className="print:bg-gray-300" />
            <div className="flex justify-between text-base font-bold print:text-sm">
              <span>Total</span>
              <span>{formatCurrency(invoice.total_amount)}</span>
            </div>
          </div>

          <Separator className="print:bg-gray-300" />

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Payment</p>
            {invoice.payments.map((p) => (
              <div key={p.id} className="flex justify-between">
                <span className="capitalize">
                  {p.payment_method.replace("_", " ")}
                </span>
                <span>{formatCurrency(p.amount)}</span>
              </div>
            ))}
            {invoice.balance > 0 && (
              <div className="flex justify-between font-medium text-destructive">
                <span>Balance Due</span>
                <span>{formatCurrency(invoice.balance)}</span>
              </div>
            )}
          </div>

          {refunds && refunds.length > 0 && (
            <>
              <Separator className="print:bg-gray-300" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Refunds
                </p>
                {refunds.map((r) => (
                  <div key={r.id} className="flex justify-between">
                    <span>{r.refund_number}</span>
                    <span className="text-destructive">
                      -{formatCurrency(r.total_amount)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="pt-4 text-center text-xs text-muted-foreground print:pt-2">
            Thank you!
          </div>
        </div>
      </div>
    </div>
  );
}
