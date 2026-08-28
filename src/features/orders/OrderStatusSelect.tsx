"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, Send } from "lucide-react";
import type { OrderStatus } from "@/lib/types";

interface OrderStatusSelectProps {
  currentStatus: OrderStatus;
  onStatusChange: (status: OrderStatus) => void;
  disabled?: boolean;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function OrderStatusSelect({
  currentStatus,
  onStatusChange,
  disabled,
}: OrderStatusSelectProps) {
  if (currentStatus === "draft" || currentStatus === "pending") {
    return (
      <Button size="sm" onClick={() => onStatusChange("confirmed")} disabled={disabled}>
        <Send className="h-4 w-4 mr-1.5" />
        Confirm Order
      </Button>
    );
  }

  if (currentStatus === "ready") {
    return (
      <Button
        size="sm"
        onClick={() => onStatusChange("served")}
        disabled={disabled}
      >
        <CheckCircle2 className="h-4 w-4 mr-1.5" />
        Mark Served
      </Button>
    );
  }

  if (currentStatus === "served") {
    // Completion is a settlement outcome reached ONLY via POS payment
    // (POST /orders/{id}/payments). A direct "Mark Completed" would be
    // rejected by the backend, so we steer staff to the till instead of
    // offering a button that always errors.
    return (
      <div className="text-sm text-muted-foreground italic">
        Served — awaiting payment to complete
      </div>
    );
  }

  // confirmed/preparing are handled by the kitchen; completed/cancelled are terminal
  return (
    <div className="text-sm text-muted-foreground italic">
      {STATUS_LABELS[currentStatus]} — no further actions
    </div>
  );
}
