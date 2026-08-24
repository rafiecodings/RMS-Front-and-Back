"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  ShoppingCart,
  Banknote,
  TrendingUp,
  Clock,
  XCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Order } from "@/lib/types";

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}) {
  return (
    <Card>
      <CardContent className="pt-1">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          </div>
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconColor}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function OrderStats({ orders }: { orders: Order[] }) {
  const total = orders.length;
  const revenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total_amount, 0);
  const avgOrder = total > 0 ? revenue / total : 0;
  const active = orders.filter(
    (o) =>
      o.status === "draft" ||
      o.status === "pending" ||
      o.status === "confirmed" ||
      o.status === "preparing" ||
      o.status === "ready" ||
      o.status === "served"
  ).length;
  const cancelled = orders.filter((o) => o.status === "cancelled").length;

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
      <StatCard
        title="Total Orders"
        value={String(total)}
        icon={ShoppingCart}
        iconColor="bg-blue-500/10 text-blue-600"
      />
      <StatCard
        title="Revenue"
        value={formatCurrency(revenue)}
        icon={Banknote}
        iconColor="bg-emerald-500/10 text-emerald-600"
      />
      <StatCard
        title="Avg Order"
        value={formatCurrency(avgOrder)}
        icon={TrendingUp}
        iconColor="bg-violet-500/10 text-violet-600"
      />
      <StatCard
        title="Active Orders"
        value={String(active)}
        icon={Clock}
        iconColor="bg-amber-500/10 text-amber-600"
      />
      <StatCard
        title="Cancelled"
        value={String(cancelled)}
        icon={XCircle}
        iconColor="bg-red-500/10 text-red-600"
      />
    </div>
  );
}
