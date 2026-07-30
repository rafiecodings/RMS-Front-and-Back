"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/shared";
import { Plus } from "lucide-react";
import { SplitPaymentLine } from "./SplitPaymentLine";
import { formatCurrency } from "@/lib/utils";
import type { PaymentLine } from "../types";
import type { PaymentMethod } from "@/lib/types";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  discountAmount: number;
  vatAmount: number;
  serviceChargeAmount: number;
  subtotal: number;
  onProcessPayment: (payments: PaymentLine[]) => void;
  isProcessing: boolean;
}

export function PaymentDialog({
  open,
  onOpenChange,
  totalAmount,
  discountAmount,
  vatAmount,
  serviceChargeAmount,
  subtotal,
  onProcessPayment,
  isProcessing,
}: PaymentDialogProps) {
  const [payments, setPayments] = useState<PaymentLine[]>([
    { id: crypto.randomUUID(), method: "cash" as PaymentMethod, amount: 0 },
  ]);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, totalAmount - totalPaid);
  const isFullyPaid = remaining <= 0.01;

  function addPaymentLine() {
    setPayments((prev) => [
      ...prev,
      { id: crypto.randomUUID(), method: "cash" as PaymentMethod, amount: 0 },
    ]);
  }

  function updatePaymentLine(id: string, updates: Partial<PaymentLine>) {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }

  function removePaymentLine(id: string) {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }

  function autoFillRemaining() {
    setPayments((prev) => {
      const updated = [...prev];
      const firstZero = updated.findIndex((p) => p.amount === 0);
      if (firstZero >= 0) {
        updated[firstZero] = { ...updated[firstZero], amount: remaining };
      }
      return updated;
    });
  }

  function handleProcess() {
    const validPayments = payments.filter((p) => p.amount > 0);
    if (validPayments.length === 0) return;
    onProcessPayment(validPayments);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Discount</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT (12%)</span>
              <span>{formatCurrency(vatAmount)}</span>
            </div>
            {serviceChargeAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service Charge</span>
                <span>{formatCurrency(serviceChargeAmount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Payment Methods</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="xs" onClick={autoFillRemaining}>
                  Auto-fill
                </Button>
                <Button variant="ghost" size="xs" onClick={addPaymentLine}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {payments.map((line, idx) => (
                <SplitPaymentLine
                  key={line.id}
                  line={line}
                  remaining={remaining + line.amount}
                  isFirst={idx === 0}
                  onUpdate={updatePaymentLine}
                  onRemove={removePaymentLine}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm font-medium">Total Paid</span>
            <span className={`text-sm font-bold ${isFullyPaid ? "text-emerald-600" : ""}`}>
              {formatCurrency(totalPaid)}
            </span>
          </div>

          {!isFullyPaid && (
            <div className="flex items-center justify-between rounded-lg border border-dashed p-3">
              <span className="text-sm font-medium">Remaining</span>
              <span className="text-sm font-bold text-destructive">
                {formatCurrency(remaining)}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleProcess}
            disabled={!isFullyPaid || isProcessing || totalPaid <= 0}
          >
            {isProcessing && <LoadingSpinner size="sm" className="mr-2" />}
            Process Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
