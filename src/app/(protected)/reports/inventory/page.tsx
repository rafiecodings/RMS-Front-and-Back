"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import {
  ReportFilters,
  ReportSummaryCard,
  InventoryTable,
  ConsumptionVarianceTable,
  WastageSummaryCard,
  TopSuppliersTable,
  ExportButton,
} from "@/features/reports";
import { useInventoryReport } from "@/features/reports/hooks/useReports";
import type { ReportPeriod, DateRange } from "@/features/reports/types";
import { LoadingSpinner } from "@/components/shared";

export default function InventoryReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: report, isLoading } = useInventoryReport({ period, date_range: dateRange });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Inventory Reports"
          description="Stock valuation and consumption variance"
        />
        <ExportButton
          reportType="inventory"
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
              title="Total Ingredients"
              value={report.total_ingredients}
              format="number"
            />
            <ReportSummaryCard
              title="Stock Value"
              value={report.total_stock_value}
              format="currency"
            />
            <ReportSummaryCard
              title="Low Stock Items"
              value={report.low_stock_count}
              format="number"
            />
          </div>

          <InventoryTable data={report.stock_valuation} />

          <div className="grid gap-6 lg:grid-cols-2">
            <ConsumptionVarianceTable data={report.consumption_variance} />
            <WastageSummaryCard data={report.wastage_summary} />
          </div>

          <TopSuppliersTable data={report.top_suppliers} />
        </>
      ) : (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-muted-foreground">No inventory data available.</p>
        </div>
      )}
    </div>
  );
}
