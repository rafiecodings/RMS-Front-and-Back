"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { LoadingSpinner } from "@/components/shared";
import {
  AnalyticsFilter,
  KpiCard,
  TopConsumedChart,
  UsageByCategoryChart,
  LowStockAlerts,
} from "@/features/analytics";
import { useInventoryUsage } from "@/features/analytics/hooks/useAnalytics";
import { Package, AlertTriangle, DollarSign } from "lucide-react";
import type { AnalyticsPeriod, DateRange } from "@/features/analytics/types";

export default function InventoryAnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: analytics, isLoading } = useInventoryUsage({ period, date_range: dateRange });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Usage"
        description="Ingredient consumption, wastage tracking, and alerts"
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
              title="Total Ingredients"
              value={analytics.total_ingredients}
              format="number"
              icon={<Package className="h-4 w-4" />}
            />
            <KpiCard
              title="Usage Cost"
              value={analytics.total_usage_cost}
              format="currency"
              icon={<DollarSign className="h-4 w-4" />}
            />
            <KpiCard
              title="Wastage Cost"
              value={analytics.wastage_cost}
              format="currency"
              icon={<AlertTriangle className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <TopConsumedChart data={analytics.top_consumed} />
            <UsageByCategoryChart data={analytics.usage_by_category} />
          </div>

          <LowStockAlerts data={analytics.low_stock_alerts} />
        </>
      ) : (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-muted-foreground">No inventory data available.</p>
        </div>
      )}
    </div>
  );
}
