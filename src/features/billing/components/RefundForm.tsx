"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/shared";
import { ConfirmDialog } from "@/components/shared";
import { formatCurrency } from "@/lib/utils";
import { useProcessRefund } from "../hooks/useBilling";
import type { Invoice } from "../types";

interface RefundFormProps {
  invoice: Invoice;
}

/**
 * The backend refunds individual recorded payments:
 * POST /invoices/{id}/refund { payment_id, amount, reason }.
 * Item-level refunds are not supported server-side, so this form offers
 * Full / Partial amounts settled against a chosen payment.
 */
export function RefundForm({ invoice }: RefundFormProps) {
  const router = useRouter();
  const processRefund = useProcessRefund();

  const paymentsWithPaid = invoice.payments.filter((p) => p.amount > 0);
  const [paymentId, setPaymentId] = useState<string>(
    paymentsWithPaid[0]?.id ?? ""
  );
  const [refundFull, setRefundFull] = useState(true);
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedPayment = paymentsWithPaid.find((p) => p.id === paymentId);
  const maxRefundable = selectedPayment?.amount ?? 0;
  const computedRefundAmount = refundFull
    ? maxRefundable
    : Math.min(customAmount, maxRefundable);

  function handleSubmit() {
    if (!selectedPayment) {
      toast.error("This invoice has no payments to refund");
      return;
    }
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
    if (!selectedPayment) return;
    processRefund.mutate(
      {
        invoiceId: invoice.id,
        paymentId: selectedPayment.id,
        amount: Math.round(computedRefundAmount * 100) / 100,
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Refund processed successfully");
          router.push("/billing/refunds");
        },
        onError: (error) => {
          const msg =
            (
              error as { response?: { data?: { message?: string } } }
            )?.response?.data?.message;
          toast.error(msg || "Failed to process refund");
        },
      }
    );
  }

  if (paymentsWithPaid.length === 0) {
    return (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
        This invoice has no recorded payments yet, so there is nothing to
        refund.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 space-y-2">
        <Label>Payment to Refund</Label>
        <Select
          value={paymentId}
          onValueChange={(v) => setPaymentId(v ?? "")}
        >
          <SelectTrigger className="w-full sm:w-[320px]">
            <SelectValue placeholder="Select payment" />
          </SelectTrigger>
          <SelectContent>
            {paymentsWithPaid.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {formatCurrency(p.amount)} ·{" "}
                {p.payment_method.replace(/_/g, " ")} ·{" "}
                {p.reference ?? "no reference"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold mb-3">Refund Type</h3>
        <div className="flex gap-2">
          <Button
            variant={refundFull ? "default" : "outline"}
            onClick={() => setRefundFull(true)}
          >
            Full Payment
          </Button>
          <Button
            variant={!refundFull ? "default" : "outline"}
            onClick={() => setRefundFull(false)}
          >
            Partial Amount
          </Button>
        </div>
      </div>

      {!refundFull && (
        <div className="rounded-lg border p-4 space-y-2">
          <Label htmlFor="refund-amount">
            Refund Amount (max {formatCurrency(maxRefundable)})
          </Label>
          <Input
            id="refund-amount"
            type="number"
            min={0.01}
            max={maxRefundable}
            step={0.01}
            value={customAmount || ""}
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
            !selectedPayment ||
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
        description={`Process refund of ${formatCurrency(computedRefundAmount)} for ${refundFull ? "the full payment" : "a partial amount"}?`}
        onConfirm={confirmRefund}
        confirmText="Confirm Refund"
      />
    </div>
  );
}
