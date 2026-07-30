"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrderStatus } from "@/lib/types";

interface OrderStatusSelectProps {
  currentStatus: OrderStatus;
  onStatusChange: (status: OrderStatus) => void;
  disabled?: boolean;
}

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served"],
  served: ["completed"],
  completed: [],
  cancelled: [],
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Placed",
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
  const nextOptions = NEXT_STATUSES[currentStatus];

  if (nextOptions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        {STATUS_LABELS[currentStatus]} — no further actions
      </div>
    );
  }

  return (
    <Select
      value=""
      onValueChange={(val) => {
        if (val) onStatusChange(val as OrderStatus);
      }}
      disabled={disabled}
    >
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue placeholder={`Move to...`} />
      </SelectTrigger>
      <SelectContent>
        {nextOptions.map((s) => (
          <SelectItem key={s} value={s}>
            {s === "cancelled" ? "✕ Cancel Order" : `→ ${STATUS_LABELS[s]}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
