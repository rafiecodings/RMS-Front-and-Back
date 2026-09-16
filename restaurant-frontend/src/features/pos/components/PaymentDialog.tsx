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
import { formatCurrency, formatLabel } from "@/lib/utils";
import type { PaymentLine } from "../types";
import type { PaymentMethod } from "@/lib/types";
import type { Customer } from "@/lib/types";
import type { Table } from "@/lib/types";
import type { OrderType } from "@/lib/types";
import type { Order } from "@/lib/types";
import { useCustomers } from "@/lib/hooks";
import { useTables } from "@/lib/hooks";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTaxRate } from "@/features/settings/hooks/useSettings";
import { customerDisplayName, tableDisplayName } from "@/lib/utils/orderDisplay";
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
  onProcessPayment: (
    payments: PaymentLine[],
    orderType: OrderType,
    customerId?: string,
    tableId?: string
  ) => void;
  isProcessing: boolean;
  existingOrder?: Order | null;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "e_wallet", label: "E-Wallet" },
];

const EWALLET_PROVIDERS = ["GCash", "Maya", "GrabPay", "Other"];

/**
 * Single-tender payment dialog — one order, one payment, one method.
 * Split payment is intentionally deferred for UAT simplicity.
 */
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
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [provider, setProvider] = useState<string>("GCash");
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [customerId, setCustomerId] = useState<string>("");
  const [tableId, setTableId] = useState<string>("");

  const { list: customersList } = useCustomers({ per_page: 100 });
  const { list: tablesList } = useTables();

  const customers = customersList.data?.data?.data ?? [];
  const tables = tablesList.data ?? [];
  const availableTables = tables.filter((t) => t.status === "available");

  const isCash = method === "cash";
  // Cash: guest hands over `amountReceived`; card/e-wallet charge exact total.
  const tendered = isCash ? Number(amountReceived || 0) : totalAmount;
  const insufficient = isCash && amountReceived !== "" && tendered < totalAmount - 0.001;
  const change = isCash && tendered >= totalAmount ? Math.round((tendered - totalAmount) * 100) / 100 : 0;
  const vatableSales = Math.max(0, Math.round((totalAmount - vatAmount) * 100) / 100);
  const canProcess =
    !isProcessing &&
    (isCash
      ? amountReceived !== "" && tendered >= totalAmount - 0.001
      : true);

  useEffect(() => {
    if (open) {
      // Reset form state each time the dialog opens. This is a legitimate
      // reset-on-open pattern; the synchronous setState is intentional.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMethod("cash");
      setAmountReceived("");
      setReference("");
      setProvider("GCash");
      setOrderType(
        existingOrder
          ? (existingOrder.order_type as OrderType)
          : "dine_in"
      );
      setCustomerId(existingOrder?.customer_id ?? "");
      setTableId(existingOrder?.table_id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleProcess() {
    if (!canProcess) return;
    const line: PaymentLine = {
      id: crypto.randomUUID(),
      method,
      amount: Math.round(tendered * 100) / 100,
      reference:
        method === "card"
          ? reference || undefined
          : method === "e_wallet"
            ? `${provider}${reference ? ` · ${reference}` : ""}`
            : undefined,
    };
    onProcessPayment(
      [line],
      orderType,
      customerId || undefined,
      orderType === "dine_in" ? tableId || undefined : undefined
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle>Process Payment</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4">
          {/* Order Context Section */}
          {existingOrder ? (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
              <h4 className="text-sm font-medium">Order Details</h4>
              <p className="text-xs text-muted-foreground">
                {existingOrder.order_number} · {formatLabel(existingOrder.order_type)}
              </p>
              <p className="text-xs text-muted-foreground">
                {`Customer: ${customerDisplayName(existingOrder)}`}
                {tableDisplayName(existingOrder)
                  ? ` · ${tableDisplayName(existingOrder)}`
                  : ""}
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/50 p-3 space-y-3">
              <h4 className="text-sm font-medium">Order Details</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs shrink-0">Order Type</Label>
                  <Select value={orderType} onValueChange={(v) => v && setOrderType(v as OrderType)}>
                    <SelectTrigger className="h-8 flex-1 min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dine_in">Dine In</SelectItem>
                      <SelectItem value="takeaway">Takeaway</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Label className="text-xs shrink-0">Customer</Label>
                  <Select value={customerId} onValueChange={(v) => setCustomerId(v ?? "")}>
                    <SelectTrigger className="h-8 flex-1 min-w-0">
                      <SelectValue placeholder="Walk-in Customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Walk-in Customer</SelectItem>
                      {customers.map((c: Customer) => (
                        <SelectItem key={c.id} value={c.id} className="truncate">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {orderType === "dine_in" && (
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Label className="text-xs shrink-0">Table (optional)</Label>
                    <Select value={tableId} onValueChange={(v) => setTableId(v ?? "")}>
                      <SelectTrigger className="h-8 flex-1 min-w-0">
                        <SelectValue placeholder="Select Table" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No Table</SelectItem>
                        {availableTables.map((t: Table) => (
                          <SelectItem key={t.id} value={t.id} className="truncate">
                            T{t.number} ({t.capacity} seats)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
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
              <span className="text-muted-foreground">VATable Sales</span>
              <span>{formatCurrency(vatableSales)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                VAT ({taxRate}%, inclusive)
              </span>
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
              <span>Total Due</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    method === m.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {isCash ? (
              <div className="space-y-1.5">
                <Label htmlFor="cash-received" className="text-xs">Amount Received</Label>
                <Input
                  id="cash-received"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="0.00"
                  aria-invalid={insufficient}
                  className={insufficient ? "border-red-500" : ""}
                />
                {insufficient ? (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Insufficient amount received.
                  </p>
                ) : (
                  change > 0 && (
                    <div className="flex items-center justify-between rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/5 p-2">
                      <span className="text-sm font-medium">Change</span>
                      <span className="text-base font-bold text-emerald-600">
                        {formatCurrency(change)}
                      </span>
                    </div>
                  )
                )}
              </div>
            ) : method === "e_wallet" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Provider</Label>
                  <Select value={provider} onValueChange={(v) => setProvider(v ?? "GCash")}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EWALLET_PROVIDERS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ewallet-ref" className="text-xs">Reference Number</Label>
                  <Input
                    id="ewallet-ref"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Amount charged: <strong>{formatCurrency(totalAmount)}</strong> (exact bill total)
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="card-ref" className="text-xs">Reference Number</Label>
                <Input
                  id="card-ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Optional (last 4 digits / approval code)"
                />
                <p className="text-xs text-muted-foreground">
                  Amount charged: <strong>{formatCurrency(totalAmount)}</strong> (exact bill total)
                </p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleProcess} disabled={!canProcess}>
            {isProcessing && <LoadingSpinner size="sm" className="mr-2" />}
            Process Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
