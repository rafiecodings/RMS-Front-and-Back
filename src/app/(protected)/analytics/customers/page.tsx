"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { LoadingSpinner } from "@/components/shared";
import {
  AnalyticsFilter,
  KpiCard,
  CustomerVisitTrend,
  CustomerSegments,
  TopCustomersTable,
} from "@/features/analytics";
import { useCustomerAnalytics } from "@/features/analytics/hooks/useAnalytics";
import { Users, UserPlus, Repeat, DollarSign } from "lucide-react";
import type { AnalyticsPeriod, DateRange } from "@/features/analytics/types";

export default function CustomerAnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: analytics, isLoading } = useCustomerAnalytics({ period, date_range: dateRange });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Analytics"
        description="Visit patterns, customer segments, and loyalty insights"
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
          <div className="grid gap-4 md:grid-cols-4">
            <KpiCard
              title="Total Customers"
              value={analytics.total_customers}
              format="number"
              icon={<Users className="h-4 w-4" />}
            />
            <KpiCard
              title="New Customers"
              value={analytics.new_customers}
              format="number"
              icon={<UserPlus className="h-4 w-4" />}
            />
            <KpiCard
              title="Returning"
              value={analytics.returning_customers}
              format="number"
              icon={<Repeat className="h-4 w-4" />}
            />
            <KpiCard
              title="Avg Lifetime Value"
              value={analytics.average_lifetime_value}
              format="currency"
              icon={<DollarSign className="h-4 w-4" />}
            />
          </div>

          <CustomerVisitTrend data={analytics.visit_trends} />

          <div className="grid gap-6 lg:grid-cols-2">
            <CustomerSegments data={analytics.customer_segments} />
            <div className="space-y-4">
              <KpiCard
                title="Avg Visit Frequency"
                value={analytics.average_visit_frequency}
                format="number"
                subtitle="visits per customer"
              />
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h4 className="text-sm font-medium mb-3">Visit Frequency Distribution</h4>
                <div className="space-y-2">
                  {analytics.visit_frequency.map((freq) => (
                    <div key={freq.range} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{freq.range}</span>
                        <span className="font-medium">
                          {freq.count} ({freq.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${freq.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <TopCustomersTable data={analytics.top_customers} />
        </>
      ) : (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-muted-foreground">No customer data available.</p>
        </div>
      )}
    </div>
  );
}
