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
import type { CartItem, PosDiscount, PaymentLine } from "../types";
import type { OrderType } from "@/lib/types";

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  discount?: PosDiscount;
  discountAmount: number;
  vatAmount: number;
  serviceChargeAmount: number;
  totalAmount: number;
  payments: PaymentLine[];
  orderType: OrderType;
  onNewOrder: () => void;
}

export function ReceiptDialog({
  open,
  onOpenChange,
  orderNumber,
  items,
  subtotal,
  discount,
  discountAmount,
  vatAmount,
  serviceChargeAmount,
  totalAmount,
  payments,
  orderType,
  onNewOrder,
}: ReceiptDialogProps) {
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const change = totalPaid - totalAmount;

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
              <p className="font-bold">Restaurant Management System</p>
              <p className="text-xs text-muted-foreground">{dateStr} {timeStr}</p>
              <p className="text-xs text-muted-foreground">Order #{orderNumber}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {orderType.replace("_", " ")}
              </p>
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
                  <span>
                    Discount
                    {discount &&
                      ` (${discount.type === "percentage" ? `${discount.value}%` : formatCurrency(discount.value)})`}
                  </span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT (12%)</span>
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
                <div key={p.id} className="flex justify-between">
                  <span className="capitalize">{p.method.replace("_", " ")}</span>
                  <span>{formatCurrency(p.amount)}</span>
                </div>
              ))}
              {change > 0 && (
                <div className="flex justify-between font-medium">
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
