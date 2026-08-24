"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import type { CartItem, PaymentLine } from "../types";
import type { OrderType } from "@/lib/types";
import { useTaxRate, useSettings } from "@/features/settings/hooks/useSettings";
import { useAuth } from "@/providers/AuthProvider";

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  serviceChargeAmount: number;
  totalAmount: number;
  payments: PaymentLine[];
  /** Balance this payment session settles (defaults to the full total). */
  amountDueForChange?: number;
  /** Amount already paid on the order before this session. */
  previouslyPaid?: number;
  orderType: OrderType;
  customerName?: string;
  tableNumber?: string;
  onNewOrder: () => void;
}

export function ReceiptDialog({
  open,
  onOpenChange,
  orderNumber,
  items,
  subtotal,
  discountAmount,
  vatAmount,
  serviceChargeAmount,
  totalAmount,
  payments,
  amountDueForChange,
  previouslyPaid,
  orderType,
  customerName,
  tableNumber,
  onNewOrder,
}: ReceiptDialogProps) {
  const taxRate = useTaxRate();
  const { data: settings } = useSettings();
  const { user } = useAuth();
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const dueNow = amountDueForChange ?? totalAmount;
  const change = Math.max(0, Math.round((totalPaid - dueNow) * 100) / 100);

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

  function handleNewOrder() {
    onNewOrder();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md print:max-w-none print:p-0">
        <div className="print:p-4">
          <DialogHeader className="print:text-center">
            <DialogTitle className="print:text-lg">Receipt</DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-3 text-sm print:text-xs">
            <div className="text-center print:text-center">
              {/* Restaurant identity comes from Settings (authoritative). */}
              <p className="font-bold uppercase tracking-wide">
                {settings?.name || "Restaurant"}
              </p>
              {settings?.address && (
                <p className="text-xs text-muted-foreground">{settings.address}</p>
              )}
              {settings?.phone && (
                <p className="text-xs text-muted-foreground">{settings.phone}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">{dateStr} · {timeStr}</p>
              <p className="text-xs text-muted-foreground">Order # {orderNumber}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {orderType.replace("_", " ")}
              </p>
              {user?.name && (
                <p className="text-xs text-muted-foreground">Cashier: {user.name}</p>
              )}
              {(customerName || tableNumber) && (
                <p className="text-xs text-muted-foreground">
                  {customerName ? `Customer: ${customerName}` : ""}
                  {customerName && tableNumber ? " · " : ""}
                  {tableNumber ? `Table ${tableNumber}` : ""}
                </p>
              )}
            </div>

            <Separator className="print:bg-gray-300" />

            <div className="space-y-1.5">
              {items.map((item) => {
                const modifierTotal =
                  item.modifiers?.reduce((m, mod) => m + mod.price, 0) ?? 0;
                const lineTotal = (item.price + modifierTotal) * item.quantity;
                return (
                  <div key={item.id} className="flex justify-between">
                    <span className="flex-1">
                      {item.quantity}× {item.name}
                      {item.variant && ` (${item.variant})`}
                    </span>
                    <span className="font-medium">{formatCurrency(lineTotal)}</span>
                  </div>
                );
              })}
            </div>

            <Separator className="print:bg-gray-300" />

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Discount</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT ({taxRate}%)</span>
                <span>{formatCurrency(vatAmount)}</span>
              </div>
              {serviceChargeAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Charge</span>
                  <span>{formatCurrency(serviceChargeAmount)}</span>
                </div>
              )}
              <Separator className="print:bg-gray-300" />
              <div className="flex justify-between text-base font-bold print:text-sm">
                <span>Total</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <Separator className="print:bg-gray-300" />

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Payment</p>
              {payments.map((p) => (
                <div key={p.id} className="flex justify-between gap-2">
                  <span className="capitalize">
                    {p.method.replace("_", " ")}
                    {p.reference ? (
                      <span className="text-muted-foreground normal-case">
                        {" "}
                        ({p.reference})
                      </span>
                    ) : null}
                  </span>
                  <span>{formatCurrency(p.amount)}</span>
                </div>
              ))}
              <Separator className="print:bg-gray-300" />
              {previouslyPaid != null && previouslyPaid > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Previously Paid</span>
                  <span>{formatCurrency(previouslyPaid)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium">
                <span>Amount Paid</span>
                <span>{formatCurrency(totalPaid)}</span>
              </div>
              {change > 0 && (
                <div className="flex justify-between font-medium text-emerald-600">
                  <span>Change</span>
                  <span>{formatCurrency(change)}</span>
                </div>
              )}
            </div>

            <div className="pt-4 text-center text-xs text-muted-foreground print:pt-2">
              Thank you!
            </div>
          </div>
        </div>

        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            Print
          </Button>
          <Button onClick={handleNewOrder}>New Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
