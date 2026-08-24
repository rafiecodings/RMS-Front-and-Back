"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, PhilippinePeso, ShoppingCart, Users, Table } from "lucide-react";
import type { DashboardSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function KPICard({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
}: {
  title: string;
  value: string;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card>
      <CardContent className="pt-1">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 text-xs">
                {isPositive ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span
                  className={
                    isPositive ? "text-emerald-600" : "text-red-600"
                  }
                >
                  {isPositive ? "+" : ""}
                  {change.toFixed(1)}%
                </span>
                <span className="text-muted-foreground">vs yesterday</span>
              </div>
            )}
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

export function RevenueCards({ data }: { data: DashboardSummary }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Today's Revenue"
        value={formatCurrency(data.revenue.today)}
        change={data.revenue.comparison_percentage}
        icon={PhilippinePeso}
        iconColor="bg-emerald-500/10 text-emerald-600"
      />
      <KPICard
        title="Active Orders"
        value={String(data.orders.active)}
        icon={ShoppingCart}
        iconColor="bg-blue-500/10 text-blue-600"
      />
      <KPICard
        title="Occupied Tables"
        value={`${data.tables.occupied}/${data.tables.total}`}
        icon={Table}
        iconColor="bg-amber-500/10 text-amber-600"
      />
      <KPICard
        title="This Month"
        value={formatCurrency(data.revenue.this_month)}
        icon={Users}
        iconColor="bg-purple-500/10 text-purple-600"
      />
    </div>
  );
}
