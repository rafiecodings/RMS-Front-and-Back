"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Clock, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@/lib/types";

function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  received: {
    label: "Received",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  in_progress: {
    label: "Cooking",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  ready: {
    label: "Ready",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
};

export function KitchenQueue({ data }: { data: DashboardSummary }) {
  const { kitchen } = data;
  const orders = kitchen.orders_in_progress;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Kitchen Queue</CardTitle>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ChefHat className="h-4 w-4" />
          <span>{kitchen.queue_length} in queue</span>
        </div>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="flex h-[160px] items-center justify-center text-muted-foreground text-sm">
            Kitchen is clear
          </div>
        ) : (
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {orders.map((order) => {
              const status = STATUS_STYLE[order.status];
              return (
                <div
                  key={order.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                    (order.priority === "rush" ||
                      order.priority === "urgent" ||
                      order.priority === "high") &&
                      "border-red-200 bg-red-50/50 dark:border-red-800/50 dark:bg-red-950/20"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {order.order_number}
                      </span>
                      {(order.priority === "rush" ||
                        order.priority === "urgent" ||
                        order.priority === "high") && (
                        <Flame className="h-3.5 w-3.5 text-red-500" />
                      )}
                      <Badge
                        variant="secondary"
                        className={cn("text-xs px-1.5 py-0", status.className)}
                      >
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.table_number
                        ? `Table ${order.table_number}`
                        : order.order_type === "takeaway"
                          ? "Takeaway"
                          : "Delivery"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {order.items
                        .map((i) => `${i.quantity}x ${i.name}`)
                        .join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" />
                    <span
                      className={cn(
                        order.elapsed_minutes > 15 &&
                          "text-red-600 dark:text-red-400 font-medium"
                      )}
                    >
                      {formatElapsed(order.elapsed_minutes)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
