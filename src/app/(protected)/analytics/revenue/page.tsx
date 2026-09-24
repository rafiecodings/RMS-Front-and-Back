"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared";
import { LoadingSpinner } from "@/components/shared";
import { AnalyticsFilter, KpiCard, RevenueTrendChart, DrillDownChart } from "@/features/analytics";
import { useRevenueAnalytics } from "@/features/analytics/hooks/useAnalytics";
import { PhilippinePeso, TrendingUp, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { AnalyticsPeriod, DateRange } from "@/features/analytics/types";

export default function RevenueAnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const filters = useMemo(() => ({ period, date_range: dateRange }), [period, dateRange]);

  const { data: analytics, isLoading } = useRevenueAnalytics(filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Analytics"
        description="Revenue trends, comparisons, and breakdown analysis"
      />

      <AnalyticsFilter
        period={period}
        dateRange={dateRange}
        onPeriodChange={setPeriod}
        onDateRangeChange={setDateRange}
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : analytics ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              title="Total Revenue"
              value={analytics.total_revenue}
              format="currency"
              change={analytics.revenue_growth}
              icon={<PhilippinePeso className="h-4 w-4" />}
            />
            <KpiCard
              title="Avg Order Value"
              value={analytics.average_order_value}
              format="currency"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <KpiCard
              title="Total Orders"
              value={analytics.revenue_by_day.reduce((s, d) => s + d.orders, 0)}
              format="number"
              icon={<ShoppingCart className="h-4 w-4" />}
            />
          </div>

          <RevenueTrendChart data={analytics.revenue_trend} />

          <div className="grid gap-6 lg:grid-cols-2">
            <DrillDownChart
              title="Revenue by Hour"
              data={analytics.revenue_by_hour}
              dataKey="revenue"
              nameKey="hour"
              formatValue={(v) => formatCurrency(v)}
              onDrillDown={() => {}}
            />
            <DrillDownChart
              title="Revenue by Order Type"
              data={analytics.revenue_by_type}
              dataKey="revenue"
              nameKey="order_type"
              formatValue={(v) => formatCurrency(v)}
              onDrillDown={() => {}}
            />
          </div>
        </>
      ) : (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-muted-foreground">No revenue data available.</p>
        </div>
      )}
    </div>
  );
}
