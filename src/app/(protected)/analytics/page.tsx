"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared";
import { AnalyticsDateRange } from "@/features/analytics";
import type { AnalyticsPeriod, DateRange } from "@/features/analytics/types";
import {
  AiInsightsPanel,
  DemandForecastCard,
  InventoryForecastCard,
} from "@/features/reports";
import { resolveReportRange } from "@/features/reports/utils/resolveReportRange";
import { useAuth } from "@/providers/AuthProvider";

export default function AnalyticsPage() {
  const { user } = useAuth();
  // Inventory restock risk is restricted to admin/manager/inventory_staff.
  const canViewInventoryForecast = ["admin", "manager", "inventory_staff"].includes(
    user?.role ?? ""
  );
  const [period, setPeriod] = useState<AnalyticsPeriod>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const range = useMemo(
    () => resolveReportRange(period, dateRange),
    [period, dateRange]
  );

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Analytics"
        description="Interactive business intelligence and insights"
        action={
          <AnalyticsDateRange
            period={period}
            dateRange={dateRange}
            resolvedRange={range}
            onPeriodChange={setPeriod}
            onDateRangeChange={setDateRange}
          />
        }
      />

      {/* AI / FORECAST INTELLIGENCE — canonical forecasting hub.
          Sales forecast first, insights, then inventory risk forecast. */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          AI Forecasting &amp; Insights
        </h2>
        <DemandForecastCard />
        <AiInsightsPanel startDate={range.start_date} endDate={range.end_date} />
        {canViewInventoryForecast && <InventoryForecastCard />}
      </section>
    </div>
  );
}
