"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Invoice, Refund } from "../types";
import { useTaxRate, useSettings } from "@/features/settings/hooks/useSettings";
import { useAuth } from "@/providers/AuthProvider";

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
  const taxRate = useTaxRate();
  const { data: settings } = useSettings();
  const { user } = useAuth();
  const vatEnabled = settings ? Boolean(settings.vat_enabled) : true;
  const vatInclusive = settings ? Boolean(settings.vat_inclusive) : true;

  // For VAT-inclusive: gross = total_amount, vatable = total_amount - tax_amount
  // For VAT-exclusive: gross = subtotal - discount + service_charge, vatable = gross
  const vatableSales = vatEnabled && vatInclusive
    ? Math.max(0, Math.round((invoice.total_amount - invoice.tax_amount) * 100) / 100)
    : vatEnabled
      ? Math.max(0, Math.round((invoice.subtotal - invoice.discount_amount + invoice.service_charge) * 100) / 100)
      : 0;

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
            {/* Restaurant identity from Settings (authoritative). */}
            <p className="text-lg font-bold print:text-base">
              {settings?.name || "Restaurant"}
            </p>
            {settings?.address && (
              <p className="text-xs text-muted-foreground">{settings.address}</p>
            )}
            {settings?.phone && (
              <p className="text-xs text-muted-foreground">{settings.phone}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {dateStr} · {timeStr}
            </p>
            {user?.name && (
              <p className="text-xs text-muted-foreground">Cashier: {user.name}</p>
            )}
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
            {invoice.statutory_discount_type && invoice.statutory_discount_amount && invoice.statutory_discount_amount > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT-Exempt Sales</span>
                  <span>{formatCurrency(invoice.vat_exempt_sales ?? 0)}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>{invoice.statutory_discount_name ?? (invoice.statutory_discount_type === "senior_citizen" ? "Senior Citizen Discount" : "PWD Discount")}</span>
                  <span>-{formatCurrency(invoice.statutory_discount_amount)}</span>
                </div>
              </>
            )}
            {vatEnabled && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VATable Sales</span>
                  <span>{formatCurrency(vatableSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT ({taxRate}%)</span>
                  <span>{formatCurrency(invoice.tax_amount)}</span>
                </div>
              </>
            )}
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
