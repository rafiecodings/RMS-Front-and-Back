"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/shared";
import { ConfirmDialog } from "@/components/shared";
import { formatCurrency } from "@/lib/utils";
import { useProcessRefund } from "../hooks/useBilling";
import type { Invoice, RefundType } from "../types";

interface RefundFormProps {
  invoice: Invoice;
}

export function RefundForm({ invoice }: RefundFormProps) {
  const router = useRouter();
  const processRefund = useProcessRefund();

  const [refundType, setRefundType] = useState<RefundType>("full");
  const [reason, setReason] = useState("");
  const [customAmount, setCustomAmount] = useState(invoice.total_amount);
  const [selectedItems, setSelectedItems] = useState<
    { order_item_id: string; quantity: number; refund_amount: number }[]
  >(
    invoice.items.map((item) => ({
      order_item_id: item.id,
      quantity: item.quantity,
      refund_amount: item.total_amount,
    }))
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  function toggleItem(itemId: string) {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.order_item_id === itemId);
      if (exists) {
        return prev.filter((i) => i.order_item_id !== itemId);
      }
      const item = invoice.items.find((i) => i.id === itemId);
      if (!item) return prev;
      return [
        ...prev,
        {
          order_item_id: item.id,
          quantity: item.quantity,
          refund_amount: item.total_amount,
        },
      ];
    });
  }

  function updateItemQuantity(orderItemId: string, qty: number) {
    setSelectedItems((prev) =>
      prev.map((i) => {
        if (i.order_item_id !== orderItemId) return i;
        const item = invoice.items.find((it) => it.id === orderItemId);
        if (!item) return i;
        const unitPrice = item.total_amount / item.quantity;
        return {
          ...i,
          quantity: qty,
          refund_amount: unitPrice * qty,
        };
      })
    );
  }

  const allSelected = selectedItems.length === invoice.items.length;

  function selectAll() {
    if (allSelected) {
      setSelectedItems([]);
    } else {
      setSelectedItems(
        invoice.items.map((item) => ({
          order_item_id: item.id,
          quantity: item.quantity,
          refund_amount: item.total_amount,
        }))
      );
    }
  }

  const computedRefundAmount =
    refundType === "full"
      ? invoice.total_amount
      : refundType === "partial"
        ? customAmount
        : selectedItems.reduce((s, i) => s + i.refund_amount, 0);

  function handleSubmit() {
    if (!reason.trim()) {
      toast.error("Please provide a reason for the refund");
      return;
    }
    if (computedRefundAmount <= 0) {
      toast.error("Refund amount must be greater than zero");
      return;
    }
    setConfirmOpen(true);
  }

  function confirmRefund() {
    processRefund.mutate(
      {
        order_id: invoice.id,
        refund_type: refundType,
        reason: reason.trim(),
        amount: refundType === "partial" ? customAmount : undefined,
        items: refundType === "item_level" ? selectedItems : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Refund processed successfully");
          router.push("/billing/refunds");
        },
        onError: () => toast.error("Failed to process refund"),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold mb-3">Refund Type</h3>
        <div className="flex gap-2">
          {(["full", "partial", "item_level"] as RefundType[]).map((type) => (
            <Button
              key={type}
              variant={refundType === type ? "default" : "outline"}
              onClick={() => setRefundType(type)}
              className="capitalize"
            >
              {type === "item_level" ? "Item Level" : type}
            </Button>
          ))}
        </div>
      </div>

      {refundType === "item_level" && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Select Items</h3>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-primary hover:underline"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div className="divide-y">
            {invoice.items.map((item) => {
              const isSelected = selectedItems.some(
                (i) => i.order_item_id === item.id
              );
              const selected = selectedItems.find(
                (i) => i.order_item_id === item.id
              );
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2.5"
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleItem(item.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.menu_item_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity}× {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Qty:</Label>
                      <Input
                        type="number"
                        min={1}
                        max={item.quantity}
                        value={selected?.quantity ?? item.quantity}
                        onChange={(e) =>
                          updateItemQuantity(
                            item.id,
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="h-7 w-16"
                      />
                    </div>
                  )}
                  <span className="text-sm font-medium shrink-0">
                    {formatCurrency(
                      selected?.refund_amount ?? item.total_amount
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {refundType === "partial" && (
        <div className="rounded-lg border p-4 space-y-2">
          <Label htmlFor="refund-amount">
            Refund Amount (max {formatCurrency(invoice.total_amount)})
          </Label>
          <Input
            id="refund-amount"
            type="number"
            min={0.01}
            max={invoice.total_amount}
            step={0.01}
            value={customAmount}
            onChange={(e) => setCustomAmount(parseFloat(e.target.value) || 0)}
          />
        </div>
      )}

      <div className="rounded-lg border p-4 space-y-2">
        <Label htmlFor="refund-reason">Reason for Refund *</Label>
        <Textarea
          id="refund-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason for the refund..."
          className="h-20"
        />
      </div>

      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Original Total</span>
          <span>{formatCurrency(invoice.total_amount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Amount Already Paid</span>
          <span>{formatCurrency(invoice.amount_paid)}</span>
        </div>
        <Separator />
        <div className="flex justify-between text-base font-bold">
          <span>Refund Amount</span>
          <span className="text-destructive">
            -{formatCurrency(computedRefundAmount)}
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            computedRefundAmount <= 0 ||
            !reason.trim() ||
            processRefund.isPending
          }
        >
          {processRefund.isPending && (
            <LoadingSpinner size="sm" className="mr-2" />
          )}
          Process Refund
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm Refund"
        description={`Process refund of ${formatCurrency(computedRefundAmount)} for ${refundType === "full" ? "full order" : refundType === "partial" ? "partial amount" : "selected items"}?`}
        onConfirm={confirmRefund}
        confirmText="Confirm Refund"
      />
    </div>
  );
}
