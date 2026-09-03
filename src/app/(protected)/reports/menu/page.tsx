"use client";

import { useState } from "react";
import { PageHeader, ErrorState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ReportFilters, ReportSummaryCard, ExportButton } from "@/features/reports";
import { useMenuPerformanceReport } from "@/features/reports/hooks/useReports";
import { formatCurrency } from "@/lib/utils";
import type { ReportPeriod, DateRange } from "@/features/reports/types";
import { LoadingSpinner } from "@/components/shared";

export default function MenuPerformancePage() {
  const [period, setPeriod] = useState<ReportPeriod>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: report, isLoading, isError } = useMenuPerformanceReport({ period, date_range: dateRange });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Menu Performance"
          description="Item sales performance for the selected period"
        />
        <ExportButton
          reportType="menu"
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
        <ErrorState message="Failed to load menu performance. Please try again." />
      ) : report ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <ReportSummaryCard
              title="Total Menu Items"
              value={report.total_menu_items}
              format="number"
            />
            <ReportSummaryCard
              title="Active Items"
              value={report.active_items}
              format="number"
            />
            <ReportSummaryCard
              title="Items Sold (period)"
              value={report.item_performance.reduce((s, i) => s + i.quantity_sold, 0)}
              format="number"
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">Best-Selling Items</CardTitle>
              <span className="text-xs text-muted-foreground">
                {report.item_performance.length} items sold
              </span>
            </CardHeader>
            <CardContent>
              {report.item_performance.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No items were sold in this period.
                </p>
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Qty Sold</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Avg Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.item_performance.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            {item.category ? (
                              <Badge variant="outline">{item.category}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{item.quantity_sold}</TableCell>
                          <TableCell className="text-right">{item.order_count}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.revenue)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {item.quantity_sold > 0
                              ? formatCurrency(item.revenue / item.quantity_sold)
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Cost and margin tracking requires recipe-level ingredient costing.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">Worst-Selling Items</CardTitle>
              <span className="text-xs text-muted-foreground">
                {report.bottom_items.length} low performers
              </span>
            </CardHeader>
            <CardContent>
              {report.bottom_items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No low-performing items in this period.
                </p>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Qty Sold</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.bottom_items.map((item) => (
                        <TableRow key={`worst-${item.id}`}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            {item.category ? (
                              <Badge variant="outline">{item.category}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{item.quantity_sold}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Lowest revenue items with completed sales in the selected period.
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-muted-foreground">No menu performance data available.</p>
        </div>
      )}
    </div>
  );
}
