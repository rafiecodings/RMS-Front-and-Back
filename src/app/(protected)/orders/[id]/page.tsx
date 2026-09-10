"use client";

import { useState } from "react";
import { use } from "react";
import Link from "next/link";
import {
  PageHeader,
  LoadingSpinner,
  ConfirmDialog,
} from "@/components/shared";
import { OrderDetail, OrderStatusSelect } from "@/features/orders";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { useOrder, useOrders } from "@/lib/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";
import type { OrderStatus } from "@/lib/types";
import { canConfirmOrder } from "@/lib/utils/permissions";

const REFUND_ROLES = ["admin", "manager", "cashier"];
const TERMINAL_STATUSES = ["completed", "cancelled", "voided"];

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [cancelTarget, setCancelTarget] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [voidTarget, setVoidTarget] = useState(false);
  const [voidReason, setVoidReason] = useState("");

  const [refundTarget, setRefundTarget] = useState(false);
  const [refundPaymentId, setRefundPaymentId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const { data: order, isLoading } = useOrder(id);
  const { updateStatus, cancel, voidOrder, refund } = useOrders();
  const { user } = useAuth();

  const role = user?.role ?? "";
  const canIssueRefund = REFUND_ROLES.includes(role);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <PageHeader
          title="Order Not Found"
          description="The order you're looking for doesn't exist."
          action={
            <Button variant="outline" size="sm" render={<Link href="/orders" />}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Orders
            </Button>
          }
        />
      </div>
    );
  }

  const isTerminal = TERMINAL_STATUSES.includes(order.status);
  const isPaid = order.payment_status === "paid";
  const hasPayments = order.payments.length > 0;
  const canVoid =
    canIssueRefund && !isTerminal && !isPaid && order.payment_status !== "refunded";
  const canRefund = canIssueRefund && hasPayments && order.payment_status !== "refunded";

  function handleStatusChange(status: OrderStatus) {
    if (status === "cancelled") {
      setCancelTarget(true);
      return;
    }

    updateStatus.mutate(
      { id: order!.id, status },
      {
        onSuccess: () =>
          toast.success(`Order updated to ${status.replace(/_/g, " ")}`),
        onError: () => toast.error("Failed to update order status"),
      }
    );
  }

  function handleCancelConfirm() {
    cancel.mutate(
      { id: order!.id, reason: cancelReason || "Cancelled by staff" },
      {
        onSuccess: () => {
          toast.success(`Order ${order!.order_number} cancelled`);
          setCancelTarget(false);
          setCancelReason("");
        },
        onError: () => toast.error("Failed to cancel order"),
      }
    );
  }

  function openVoid() {
    setVoidReason("");
    setVoidTarget(true);
  }

  function handleVoidConfirm() {
    if (!voidReason.trim()) {
      toast.error("A reason is required to void an order.");
      return;
    }
    voidOrder.mutate(
      { id: order!.id, reason: voidReason.trim() },
      {
        onSuccess: () => {
          toast.success(`Order ${order!.order_number} voided`);
          setVoidTarget(false);
          setVoidReason("");
        },
        onError: () => toast.error("Failed to void order"),
      }
    );
  }

  function openRefund() {
    if (!order!.invoice_id) {
      toast.error("No invoice found for this order.");
      return;
    }
    const first = order!.payments[0];
    setRefundPaymentId(first?.id ?? "");
    setRefundAmount(first ? String(first.amount) : "");
    setRefundReason("");
    setRefundTarget(true);
  }

  function selectedPaymentAmount() {
    const p = order!.payments.find((pay) => pay.id === refundPaymentId);
    return p ? p.amount : 0;
  }

  function handleRefundConfirm() {
    if (!order!.invoice_id) {
      toast.error("No invoice found for this order.");
      return;
    }
    if (!refundPaymentId) {
      toast.error("Select a payment to refund.");
      return;
    }
    const amount = parseFloat(refundAmount);
    if (!refundReason.trim()) {
      toast.error("A reason is required to process a refund.");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid refund amount.");
      return;
    }
    if (amount > selectedPaymentAmount() + 0.001) {
      toast.error("Refund amount exceeds the payment amount.");
      return;
    }

    refund.mutate(
      {
        invoiceId: order!.invoice_id,
        data: {
          payment_id: refundPaymentId,
          amount,
          reason: refundReason.trim(),
        },
      },
      {
        onSuccess: () => {
          toast.success("Refund processed successfully.");
          setRefundTarget(false);
          setRefundReason("");
          setRefundAmount("");
        },
        onError: () => toast.error("Failed to process refund"),
      }
    );
  }

  return (
    <div>
      <PageHeader
        title="Order Details"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {!isTerminal && (
              <OrderStatusSelect
                currentStatus={order.status as OrderStatus}
                onStatusChange={handleStatusChange}
                disabled={updateStatus.isPending}
                canConfirm={canConfirmOrder(role)}
              />
            )}
            {canVoid && (
              <Button
                variant="destructive"
                size="sm"
                onClick={openVoid}
                disabled={voidOrder.isPending}
              >
                Void
              </Button>
            )}
            {canRefund && (
              <Button
                variant="outline"
                size="sm"
                onClick={openRefund}
                disabled={refund.isPending}
              >
                Refund
              </Button>
            )}
            <Button variant="outline" size="sm" render={<Link href="/orders" />}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
          </div>
        }
      />
      <OrderDetail order={order} />

      <ConfirmDialog
        open={cancelTarget}
        onOpenChange={(open) => {
          setCancelTarget(open);
          if (!open) setCancelReason("");
        }}
        title="Cancel Order"
        description={`Are you sure you want to cancel order ${order.order_number}? This action cannot be undone.`}
        confirmText="Cancel Order"
        variant="destructive"
        onConfirm={handleCancelConfirm}
        isLoading={cancel.isPending}
      />

      <Dialog open={voidTarget} onOpenChange={(open) => {
        setVoidTarget(open);
        if (!open) setVoidReason("");
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Void Order {order.order_number}</DialogTitle>
            <DialogDescription>
              Voiding reverses inventory and frees the table. This requires a reason and
              cannot be done on a paid order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="void-reason">Reason</Label>
            <Textarea
              id="void-reason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Explain why this order is being voided…"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidTarget(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoidConfirm}
              disabled={voidOrder.isPending}
            >
              {voidOrder.isPending && <LoadingSpinner size="sm" className="mr-2" />}
              Void Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={refundTarget} onOpenChange={(open) => {
        setRefundTarget(open);
        if (!open) {
          setRefundReason("");
          setRefundAmount("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Refund Payment</DialogTitle>
            <DialogDescription>
              Refunds are processed against an existing payment on this order&apos;s invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Payment</Label>
              <Select
                value={refundPaymentId}
                onValueChange={(value) => {
                  setRefundPaymentId(value ?? "");
                  const p = order!.payments.find((pay) => pay.id === value);
                  setRefundAmount(p ? String(p.amount) : "");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select payment" />
                </SelectTrigger>
                <SelectContent>
                  {order.payments.map((pay) => (
                    <SelectItem key={pay.id} value={pay.id}>
                      {pay.payment_method.replace(/_/g, " ")} — {pay.amount.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-amount">Amount</Label>
              <Input
                id="refund-amount"
                type="number"
                min="0"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Reason</Label>
              <Textarea
                id="refund-reason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Explain the reason for this refund…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundTarget(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRefundConfirm}
              disabled={refund.isPending}
            >
              {refund.isPending && <LoadingSpinner size="sm" className="mr-2" />}
              Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
