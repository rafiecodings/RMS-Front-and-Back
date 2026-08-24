"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { LoadingSpinner } from "@/components/shared";
import {
  AnalyticsFilter,
  KpiCard,
  PeakHoursHeatmap,
  PeakHoursBar,
} from "@/features/analytics";
import { usePeakHours } from "@/features/analytics/hooks/useAnalytics";
import { Clock, TrendingUp, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeNumber } from "@/lib/utils";
import type { AnalyticsPeriod, DateRange } from "@/features/analytics/types";

export default function PeakHoursPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: analytics, isLoading } = usePeakHours({ period, date_range: dateRange });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Peak Hours"
        description="Busy hours heatmap and hourly distribution patterns"
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
              title="Busiest Day"
              value={0}
              format="number"
              subtitle={analytics.busiest_day}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <KpiCard
              title="Quietest Day"
              value={0}
              format="number"
              subtitle={analytics.quietest_day}
              icon={<Clock className="h-4 w-4" />}
            />
            <KpiCard
              title="Avg Orders/Hour"
              value={analytics.average_orders_per_hour}
              format="number"
              icon={<BarChart3 className="h-4 w-4" />}
            />
          </div>

          <PeakHoursHeatmap data={analytics.hourly_distribution} />

          <PeakHoursBar data={analytics.peak_hours} />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">Peak Hours Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Busiest Hours</h4>
                  {analytics.peak_hours.slice(0, 5).map((peak) => (
                    <div key={peak.hour} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {peak.day_of_week} at {peak.hour}:00
                      </span>
                      <span className="font-medium">{peak.orders} orders</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Revenue by Peak Hour</h4>
                  {analytics.peak_hours.slice(0, 5).map((peak) => (
                    <div key={peak.hour} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {peak.day_of_week} at {peak.hour}:00
                      </span>
                      <span className="font-medium">
                        ₱{safeNumber(peak.revenue).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-muted-foreground">No peak hours data available.</p>
        </div>
      )}
    </div>
  );
}
