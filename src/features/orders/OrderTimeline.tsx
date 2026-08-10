"use client";

import { cn, formatDateTime } from "@/lib/utils";
import { Check, Circle } from "lucide-react";
import type { OrderStatus } from "@/lib/types";

interface TimelineStep {
  status: OrderStatus;
  label: string;
  timestamp?: string;
}

interface OrderTimelineProps {
  order: {
    status: OrderStatus;
    placed_at?: string;
    confirmed_at?: string;
    preparing_at?: string;
    ready_at?: string;
    served_at?: string;
    completed_at?: string;
    cancelled_at?: string;
    cancellation_reason?: string;
  };
}

const STATUS_FLOW: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Pending" },
  { status: "confirmed", label: "Confirmed" },
  { status: "preparing", label: "Preparing" },
  { status: "ready", label: "Ready" },
  { status: "served", label: "Served" },
  { status: "completed", label: "Completed" },
];

export function OrderTimeline({ order }: OrderTimelineProps) {
  const isCancelled = order.status === "cancelled";

  const steps: TimelineStep[] = STATUS_FLOW.map((s) => ({
    ...s,
    timestamp: order[`${s.status}_at` as keyof typeof order] as string | undefined,
  }));

  const currentIdx = steps.findIndex((s) => s.status === order.status);

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const isCompleted =
          !isCancelled && currentIdx >= 0 && i < currentIdx;
        const isCurrent = step.status === order.status;
        const isCancelledStep =
          isCancelled && step.status === "cancelled";

        return (
          <div key={step.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium",
                  isCompleted
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCancelledStep
                        ? "border-red-500 bg-red-500 text-white"
                        : "border-muted bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isCancelledStep ? (
                  <span className="text-[10px]">✕</span>
                ) : (
                  <Circle className="h-2 w-2 fill-current" />
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-[20px]",
                    isCompleted ? "bg-emerald-500" : "bg-muted"
                  )}
                />
              )}
            </div>
            <div className="pb-4 pt-0.5">
              <p
                className={cn(
                  "text-sm font-medium",
                  isCurrent
                    ? "text-foreground"
                    : isCompleted
                      ? "text-emerald-600"
                      : isCancelledStep
                        ? "text-red-600"
                        : "text-muted-foreground"
                )}
              >
                {isCancelledStep ? "Cancelled" : step.label}
              </p>
              {step.timestamp && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDateTime(step.timestamp)}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {isCancelled && order.cancelled_at && (
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-red-500 bg-red-500 text-white">
              <span className="text-[10px]">✕</span>
            </div>
          </div>
          <div className="pb-4 pt-0.5">
            <p className="text-sm font-medium text-red-600">Cancelled</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDateTime(order.cancelled_at)}
            </p>
            {order.cancellation_reason && (
              <p className="text-xs text-muted-foreground mt-0.5 italic">
                &ldquo;{order.cancellation_reason}&rdquo;
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
