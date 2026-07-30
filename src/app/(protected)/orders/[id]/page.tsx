"use client";

import { useState } from "react";
import { use } from "react";
import Link from "next/link";
import {
  PageHeader,
  LoadingSpinner,
  ConfirmDialog,
} from "@/components/shared";
import {
  OrderDetail,
  OrderStatusSelect,
  PaymentForm,
} from "@/features/orders";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, CreditCard } from "lucide-react";
import { useOrder, useOrders } from "@/lib/hooks";
import { toast } from "sonner";
import type { OrderStatus, PaymentFormData } from "@/lib/types";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const { data: order, isLoading } = useOrder(id);
  const { updateStatus, addPayment, cancel } = useOrders();

  function handleStatusChange(status: OrderStatus) {
    if (!order) return;

    if (status === "cancelled") {
      setCancelTarget(true);
      return;
    }

    updateStatus.mutate(
      { id: order.id, status },
      {
        onSuccess: () =>
          toast.success(`Order updated to ${status.replace(/_/g, " ")}`),
        onError: () => toast.error("Failed to update order status"),
      }
    );
  }

  function handlePayment(data: PaymentFormData) {
    if (!order) return;
    addPayment.mutate(
      { id: order.id, data },
      {
        onSuccess: () => {
          toast.success("Payment processed");
          setPaymentOpen(false);
        },
        onError: () => toast.error("Failed to process payment"),
      }
    );
  }

  function handleCancelConfirm() {
    if (!order) return;
    cancel.mutate(
      { id: order.id, reason: cancelReason || "Cancelled by staff" },
      {
        onSuccess: () => {
          toast.success(`Order ${order.order_number} cancelled`);
          setCancelTarget(false);
          setCancelReason("");
        },
        onError: () => toast.error("Failed to cancel order"),
      }
    );
  }

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

  const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = order.total_amount - totalPaid;
  const isTerminal = order.status === "completed" || order.status === "cancelled";

  return (
    <div>
      <PageHeader
        title="Order Details"
        action={
          <div className="flex items-center gap-2">
            {!isTerminal && (
              <OrderStatusSelect
                currentStatus={order.status}
                onStatusChange={handleStatusChange}
                disabled={updateStatus.isPending}
              />
            )}
            {balance > 0 && !isTerminal && (
              <Button
                size="sm"
                onClick={() => setPaymentOpen(true)}
              >
                <CreditCard className="h-4 w-4 mr-1.5" />
                Pay
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

      <Dialog
        open={paymentOpen}
        onOpenChange={(open) => {
          setPaymentOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
          </DialogHeader>
          <PaymentForm
            remainingAmount={balance}
            onSubmit={handlePayment}
            isLoading={addPayment.isPending}
          />
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
