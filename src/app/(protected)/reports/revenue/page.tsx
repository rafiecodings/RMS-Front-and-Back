"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { ReportFilters, ReportSummaryCard, RevenueChart, OrdersChart, ExportButton } from "@/features/reports";
import { useRevenueReport } from "@/features/reports/hooks/useReports";
import type { ReportPeriod, DateRange } from "@/features/reports/types";
import { LoadingSpinner } from "@/components/shared";

export default function RevenueReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: report, isLoading } = useRevenueReport({ period, date_range: dateRange });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Revenue Reports"
          description="Sales, revenue, and profit analysis"
        />
        <ExportButton
          reportType="revenue"
          period={period}
          dateRange={dateRange}
        />
      </div>

      <ReportFilters
        period={period}
        dateRange={dateRange}
        onPeriodChange={setPeriod}
        onDateRangeChange={setDateRange}
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : report ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <ReportSummaryCard
              title="Total Revenue"
              value={report.total_revenue}
              format="currency"
              change={report.revenue_growth}
            />
            <ReportSummaryCard
              title="Total Orders"
              value={report.total_orders}
              format="number"
            />
            <ReportSummaryCard
              title="Average Order Value"
              value={report.average_order_value}
              format="currency"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <RevenueChart data={report.daily_revenue} />
            <OrdersChart data={report.daily_revenue} />
          </div>
        </>
      ) : (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-muted-foreground">No revenue data available for this period.</p>
        </div>
      )}
    </div>
  );
}
