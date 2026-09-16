"use client";

import { useMemo, useState } from "react";
import { PageHeader, ErrorState } from "@/components/shared";
import {
  ReportFilters,
  ReportSummaryCard,
  WastageSummaryCard,
  ExportButton,
} from "@/features/reports";
import { useInventoryReport } from "@/features/reports/hooks/useReports";
import { formatCurrency } from "@/lib/utils";
import type { ReportPeriod, DateRange, LowStockItem } from "@/features/reports/types";
import { LoadingSpinner } from "@/components/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function LowStockTable({ items }: { items: LowStockItem[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Low Stock Items</CardTitle>
        <span className="text-xs text-muted-foreground">{items.length} items</span>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No low stock items — all ingredients are above their minimums.
          </p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Minimum</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {i.current_stock} {i.unit}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {i.minimum_stock}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(i.unit_cost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function InventoryReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const filters = useMemo(() => ({ period, date_range: dateRange }), [period, dateRange]);

  const { data: report, isLoading, isError } = useInventoryReport(filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Inventory Reports"
          description="Current stock and low-stock alerts; period wastage valued at current ingredient costs"
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
      ) : isError ? (
        <ErrorState message="Failed to load the inventory report. Please try again." />
      ) : report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            <ReportSummaryCard
              title="Wastage Cost (period)"
              value={report.wastage_summary.total_wastage_cost}
              format="currency"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <WastageSummaryCard data={report.wastage_summary} />
            <LowStockTable items={report.low_stock_items} />
          </div>
        </>
      ) : (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-muted-foreground">No inventory data available.</p>
        </div>
      )}
    </div>
  );
}
