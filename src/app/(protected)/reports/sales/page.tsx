"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import {
  ReportFilters,
  ReportSummaryCard,
  SalesByCategoryChart,
  RevenueByTypeChart,
  TopItemsTable,
  ExportButton,
} from "@/features/reports";
import { useSalesReport } from "@/features/reports/hooks/useReports";
import type { ReportPeriod, DateRange } from "@/features/reports/types";
import { LoadingSpinner } from "@/components/shared";

export default function SalesReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: report, isLoading } = useSalesReport({ period, date_range: dateRange });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Sales Reports"
          description="Sales breakdown by category, item, and time"
        />
        <ExportButton
          reportType="sales"
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
          <div className="grid gap-4 md:grid-cols-4">
            <ReportSummaryCard
              title="Total Sales"
              value={report.total_sales}
              format="currency"
              change={report.sales_growth}
            />
            <ReportSummaryCard
              title="Items Sold"
              value={report.total_items_sold}
              format="number"
            />
            <ReportSummaryCard
              title="Average Ticket"
              value={report.average_ticket}
              format="currency"
            />
            <ReportSummaryCard
              title="Categories"
              value={report.sales_by_category.length}
              format="number"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SalesByCategoryChart data={report.sales_by_category} />
            <RevenueByTypeChart data={report.revenue_by_type} />
          </div>

          <TopItemsTable data={report.top_items} title="Top Selling Items" variant="top" />
          <TopItemsTable data={report.bottom_items} title="Bottom Selling Items" variant="bottom" />
        </>
      ) : (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-muted-foreground">No sales data available for this period.</p>
        </div>
      )}
    </div>
  );
}
