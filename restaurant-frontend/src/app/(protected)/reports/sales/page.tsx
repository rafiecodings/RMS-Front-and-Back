"use client";

import { useState } from "react";
import { PageHeader, ErrorState } from "@/components/shared";
import {
  ReportFilters,
  ReportSummaryCard,
  SalesByCategoryChart,
  RevenueByTypeChart,
  RevenueByPaymentChart,
  TopItemsTable,
  ExportButton,
} from "@/features/reports";
import { useSalesReport, useMenuPerformanceReport } from "@/features/reports/hooks/useReports";
import type { ReportPeriod, DateRange } from "@/features/reports/types";
import { LoadingSpinner } from "@/components/shared";

export default function SalesReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const filters = { period, date_range: dateRange };

  const { data: report, isLoading, isError } = useSalesReport(filters);
  // Real top/bottom sellers come from the menu-performance dataset.
  const { data: menuReport, isLoading: menuLoading } = useMenuPerformanceReport(filters);

  const items = menuReport?.item_performance ?? [];
  const topItems = items.slice(0, 10).map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    quantity_sold: i.quantity_sold,
    revenue: i.revenue,
    average_price: i.quantity_sold > 0 ? i.revenue / i.quantity_sold : 0,
  }));
  // Least revenue among the items that actually sold in the period.
  const bottomItems = [...items]
    .sort((a, b) => a.revenue - b.revenue)
    .slice(0, 10)
    .map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      quantity_sold: i.quantity_sold,
      revenue: i.revenue,
      average_price: i.quantity_sold > 0 ? i.revenue / i.quantity_sold : 0,
    }));

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

      {isLoading || menuLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <ErrorState
          message="Failed to load the sales report. Please try again."
          className="mb-4"
        />
      ) : report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

          <div className="grid gap-6 lg:grid-cols-2">
            <RevenueByPaymentChart data={report.revenue_by_payment} />
            <TopItemsTable
              data={report.hourly_distribution.map((h) => ({
                id: String(h.hour),
                name: `${String(h.hour).padStart(2, "0")}:00 – ${String(h.hour).padStart(2, "0")}:59`,
                category: "",
                quantity_sold: h.orders,
                revenue: h.revenue,
                average_price: h.orders > 0 ? h.revenue / h.orders : 0,
              }))}
              title="Busiest Hours (by orders)"
              variant="top"
            />
          </div>

          <TopItemsTable data={topItems} title="Top Selling Items" variant="top" />
          <TopItemsTable data={bottomItems} title="Lowest Selling Items" variant="bottom" />
        </>
      ) : (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-muted-foreground">No sales data available for this period.</p>
        </div>
      )}
    </div>
  );
}
