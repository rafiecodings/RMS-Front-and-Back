"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared";
import { LoadingSpinner } from "@/components/shared";
import {
  AnalyticsFilter,
  KpiCard,
  BestSellingItems,
  DrillDownChart,
} from "@/features/analytics";
import { useSalesTrends } from "@/features/analytics/hooks/useAnalytics";
import { ShoppingCart, TrendingUp, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { AnalyticsPeriod, DateRange } from "@/features/analytics/types";

export default function SalesAnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const filters = useMemo(() => ({ period, date_range: dateRange }), [period, dateRange]);

  const { data: analytics, isLoading } = useSalesTrends(filters);

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Sales Trends"
        description="Sales performance, category breakdown, and best sellers"
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
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 min-w-0">
            <KpiCard
              title="Total Sales"
              value={analytics.total_sales}
              format="currency"
              change={analytics.sales_growth}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <KpiCard
              title="Items Sold"
              value={analytics.total_items_sold}
              format="number"
              icon={<ShoppingCart className="h-4 w-4" />}
            />
            <KpiCard
              title="Average Ticket"
              value={analytics.average_ticket}
              format="currency"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <KpiCard
              title="Categories"
              value={analytics.sales_by_category.length}
              format="number"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DrillDownChart
              title="Sales by Category"
              data={analytics.sales_by_category}
              dataKey="revenue"
              nameKey="category"
              formatValue={(v) => formatCurrency(v)}
              onDrillDown={() => {}}
            />
            <DrillDownChart
              title="Sales by Day"
              data={analytics.sales_by_day}
              dataKey="items_sold"
              nameKey="date"
              formatValue={(v) => `${v} items`}
              onDrillDown={() => {}}
            />
          </div>

          <BestSellingItems data={analytics.top_items} limit={10} />
        </>
      ) : (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-muted-foreground">No sales data available.</p>
        </div>
      )}
    </div>
  );
}
