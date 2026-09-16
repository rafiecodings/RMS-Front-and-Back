"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared";
import { ReportFilters, ReportSummaryCard, RevenueChart, OrdersChart, ExportButton } from "@/features/reports";
import { useRevenueReport } from "@/features/reports/hooks/useReports";
import type { ReportPeriod, DateRange } from "@/features/reports/types";
import { LoadingSpinner } from "@/components/shared";

export default function RevenueReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const filters = useMemo(() => ({ period, date_range: dateRange }), [period, dateRange]);

  const { data: report, isLoading, isError: listError } = useRevenueReport(filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Revenue Reports"
          description="Completed, paid orders and approved refunds against those orders"
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
      ) : listError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load the revenue report. Please try again.
        </div>
      ) : report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <ReportSummaryCard
              title="Gross Revenue"
              value={report.gross_revenue}
              format="currency"
            />
            <ReportSummaryCard
              title="Refunds"
              value={report.refunds}
              format="currency"
            />
            <ReportSummaryCard
              title="Net Revenue"
              value={report.net_revenue}
              format="currency"
            />
            <ReportSummaryCard
              title="Average Order Value"
              value={report.average_order_value}
              format="currency"
            />
            <ReportSummaryCard title="Paid Completed Orders" value={report.total_orders} format="number" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <RevenueChart data={report.daily_revenue} title="Net Revenue Trend" />
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
