"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Banknote, Smartphone, Building2 } from "lucide-react";
import type { DashboardSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const ORDER_TYPE_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  dine_in: { label: "Dine-in", color: "bg-blue-500" },
  takeaway: { label: "Takeaway", color: "bg-amber-500" },
  delivery: { label: "Delivery", color: "bg-emerald-500" },
};

const PAYMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  cash: Banknote,
  card: CreditCard,
  digital_wallet: Smartphone,
  room_charge: Building2,
  corporate_account: Building2,
};

export function SalesSummary({ data }: { data: DashboardSummary }) {
  const { sales } = data;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Today&apos;s Sales</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight">
            {formatCurrency(sales.total_today)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-muted/50 p-2.5">
            <p className="text-lg font-bold">{sales.transaction_count}</p>
            <p className="text-[10px] text-muted-foreground">Transactions</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <p className="text-lg font-bold">{formatCurrency(sales.average_ticket)}</p>
            <p className="text-[10px] text-muted-foreground">Avg. Ticket</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <p className="text-lg font-bold">{data.orders.total_today}</p>
            <p className="text-[10px] text-muted-foreground">Orders</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            By Order Type
          </p>
          {sales.by_type.map((item) => {
            const config = ORDER_TYPE_CONFIG[item.order_type];
            const pct = sales.total_today > 0
              ? Math.round((item.revenue / sales.total_today) * 100)
              : 0;
            return (
              <div key={item.order_type} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${config?.color || "bg-gray-400"}`} />
                    <span>{config?.label || item.order_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {item.count} orders
                    </span>
                    <span className="font-medium">{formatCurrency(item.revenue)}</span>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${config?.color || "bg-gray-400"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            By Payment Method
          </p>
          <div className="grid grid-cols-2 gap-2">
            {sales.by_payment.map((item) => {
              const Icon = PAYMENT_ICONS[item.method] || CreditCard;
              return (
                <div
                  key={item.method}
                  className="flex items-center gap-2 rounded-lg border p-2"
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate capitalize">
                      {item.method.replace(/_/g, " ")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatCurrency(item.revenue)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
