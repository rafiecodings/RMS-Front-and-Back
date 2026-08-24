"use client";

import { useState, useEffect } from "react";
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
import type { Customer } from "@/lib/types";
import type { Table } from "@/lib/types";
import type { OrderType } from "@/lib/types";
import type { Order } from "@/lib/types";
import { useCustomers } from "@/lib/hooks";
import { useTables } from "@/lib/hooks";
import { Label } from "@/components/ui/label";
import { useTaxRate } from "@/features/settings/hooks/useSettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  discountAmount: number;
  vatAmount: number;
  serviceChargeAmount: number;
  subtotal: number;
  onProcessPayment: (payments: PaymentLine[], orderType: OrderType, customerId?: string, tableId?: string) => void;
  isProcessing: boolean;
  existingOrder?: Order | null;
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
  existingOrder,
}: PaymentDialogProps) {
  const taxRate = useTaxRate();
  const [payments, setPayments] = useState<PaymentLine[]>([
    { id: crypto.randomUUID(), method: "cash" as PaymentMethod, amount: 0 },
  ]);
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway" | "delivery">("dine_in");
  const [customerId, setCustomerId] = useState<string>("");
  const [tableId, setTableId] = useState<string>("");

  const { list: customersList } = useCustomers({ per_page: 100 });
  const { list: tablesList } = useTables();

  const customers = customersList.data?.data?.data ?? [];
  const tables = tablesList.data ?? [];
  const availableTables = tables.filter(
    (t) => t.status === "available"
  );

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, totalAmount - totalPaid);
  const isFullyPaid = remaining <= 0.01;
  const hasEnteredAmount = totalPaid > 0;
  const change = isFullyPaid ? Math.round((totalPaid - totalAmount) * 100) / 100 : 0;

  useEffect(() => {
    if (open) {
      // Reset form state each time the dialog opens. This is a legitimate
      // reset-on-open pattern; the synchronous setState is intentional.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPayments([
        { id: crypto.randomUUID(), method: "cash" as PaymentMethod, amount: 0 },
      ]);
      setOrderType(
        existingOrder
          ? (existingOrder.order_type as "dine_in" | "takeaway" | "delivery")
          : "dine_in"
      );
      setCustomerId(existingOrder?.customer_id ?? "");
      setTableId(existingOrder?.table_id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  function handleProcess() {
    const validPayments = payments.filter((p) => p.amount > 0);
    if (validPayments.length === 0) return;
    onProcessPayment(validPayments, orderType, customerId || undefined, orderType === "dine_in" ? (tableId || undefined) : undefined);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Context Section */}
          {existingOrder ? (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
              <h4 className="text-sm font-medium">Order Details</h4>
              <p className="text-xs text-muted-foreground">
                {existingOrder.order_number} ·{" "}
                <span className="capitalize">
                  {existingOrder.order_type.replace(/_/g, " ")}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {existingOrder.customer
                  ? `Customer: ${existingOrder.customer.name}`
                  : "Walk-in customer"}
                {existingOrder.table
                  ? ` · Table ${existingOrder.table.number}`
                  : ""}
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/50 p-3 space-y-3">
              <h4 className="text-sm font-medium">Order Details</h4>
              <div className="flex gap-2">
                <Label className="text-xs">Order Type</Label>
                <Select value={orderType} onValueChange={(v) => v && setOrderType(v as "dine_in" | "takeaway" | "delivery")}>
                  <SelectTrigger className="h-8 w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dine_in">Dine In</SelectItem>
                    <SelectItem value="takeaway">Takeaway</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Label className="text-xs">Customer</Label>
                <Select value={customerId} onValueChange={(v) => setCustomerId(v ?? "")}>
                  <SelectTrigger className="h-8 w-[200px]">
                    <SelectValue placeholder="Walk-in Customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Walk-in Customer</SelectItem>
                    {customers.map((c: Customer) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {orderType === "dine_in" && (
                <div className="flex gap-2">
                  <Label className="text-xs">Table</Label>
                  <Select value={tableId} onValueChange={(v) => setTableId(v ?? "")}>
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue placeholder="Select Table" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Table</SelectItem>
                      {availableTables.map((t: Table) => (
                        <SelectItem key={t.id} value={t.id}>
                          T{t.number} ({t.capacity} seats)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

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
              <span className="text-muted-foreground">VAT ({taxRate}%)</span>
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
              <Button variant="ghost" size="xs" onClick={addPaymentLine}>
                <Plus className="h-3 w-3 mr-1" /> Add Method
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {payments.map((line, idx) => (
                <SplitPaymentLine
                  key={line.id}
                  line={line}
                  isFirst={idx === 0}
                  onUpdate={updatePaymentLine}
                  onRemove={removePaymentLine}
                />
              ))}
            </div>
          </div>

          {!isFullyPaid && hasEnteredAmount && (
            <p className="text-xs text-destructive">
              Amount entered does not cover the total. Enter the full amount to
              complete the payment.
            </p>
          )}

          <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
            <span className="text-sm font-medium">Total Paid</span>
            <span className={`text-sm font-bold ${isFullyPaid ? "text-emerald-600" : ""}`}>
              {formatCurrency(totalPaid)}
            </span>
          </div>

          {change > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/5 p-3">
              <span className="text-sm font-medium">Change</span>
              <span className="text-base font-bold text-emerald-600">
                {formatCurrency(change)}
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
