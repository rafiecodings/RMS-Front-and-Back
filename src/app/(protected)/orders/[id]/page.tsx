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
import { ArrowLeft } from "lucide-react";
import { useOrder, useOrders } from "@/lib/hooks";
import { toast } from "sonner";
import type { OrderStatus } from "@/lib/types";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [cancelTarget, setCancelTarget] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const { data: order, isLoading } = useOrder(id);
  const { updateStatus, cancel } = useOrders();

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
    </div>
  );
}
