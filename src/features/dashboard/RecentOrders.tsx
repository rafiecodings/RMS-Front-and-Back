"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/shared";
import { formatCurrency, timeAgo } from "@/lib/utils";
import type { DashboardSummary } from "@/lib/types";

const ORDER_TYPE_LABEL: Record<string, string> = {
  dine_in: "Dine-in",
  takeaway: "Takeaway",
  delivery: "Delivery",
};

export function RecentOrders({ data }: { data: DashboardSummary }) {
  const orders = data.recent_orders;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
        <Link
          href="/orders"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="flex h-[160px] items-center justify-center text-muted-foreground text-sm">
            No orders yet today
          </div>
        ) : (
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors odd:bg-muted/20"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {order.order_number}
                    </span>
                    <StatusBadge status={order.status} className="text-xs px-1.5 py-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.customer_name || "Walk-in"} &middot;{" "}
                    {ORDER_TYPE_LABEL[order.order_type]}
                    {order.table_number && ` · ${order.table_number}`}
                    {` · ${order.items_count} item${order.items_count !== 1 ? "s" : ""}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{formatCurrency(order.total)}</p>
                  <p className="text-sm text-muted-foreground">
                    {timeAgo(order.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
