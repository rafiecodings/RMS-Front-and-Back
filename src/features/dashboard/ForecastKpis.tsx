"use client";

import { useLowStockProjection } from "@/features/analytics/hooks/useAnalytics";
import { Card, CardContent } from "@/components/ui/card";
import { PackageSearch, TriangleAlert } from "lucide-react";

function KpiStat({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
}: {
  title: string;
  value: string;
  subtitle: string;
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
            <p className="text-xs text-muted-foreground">{subtitle}</p>
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

export function ForecastKpis() {
  const { data } = useLowStockProjection(7);

  const items = data?.items ?? [];
  const summary = data?.summary;

  const atRisk = items.filter((item) =>
    ["out_of_stock", "critical", "high"].includes(item.severity)
  ).length;

  const totalDailyUsage = items.reduce(
    (sum, item) => sum + (item.forecast_daily_usage ?? 0),
    0
  );
  const predicted7d = Math.round(totalDailyUsage * (data?.horizon_days ?? 7));

  const outOfStock = summary?.out_of_stock ?? 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <KpiStat
        title="Predicted Demand (7d)"
        value={predicted7d.toLocaleString()}
        subtitle="Projected ingredient usage"
        icon={PackageSearch}
        iconColor="bg-indigo-500/10 text-indigo-600"
      />
      <KpiStat
        title="Stockout Risk"
        value={String(atRisk)}
        subtitle={
          outOfStock > 0
            ? `${outOfStock} already out of stock`
            : "ingredients projected to run out soon"
        }
        icon={TriangleAlert}
        iconColor="bg-amber-500/10 text-amber-600"
      />
    </div>
  );
}
