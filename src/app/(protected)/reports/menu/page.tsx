"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
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
import { formatCurrency, safeNumber } from "@/lib/utils";
import type { ReportPeriod, DateRange } from "@/features/reports/types";
import { LoadingSpinner } from "@/components/shared";

export default function MenuPerformancePage() {
  const [period, setPeriod] = useState<ReportPeriod>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: report, isLoading } = useMenuPerformanceReport({ period, date_range: dateRange });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Menu Performance"
          description="Item performance and margin analysis"
        />
        <ExportButton
          reportType="menu-performance"
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
              title="Average Margin"
              value={report.average_margin}
              format="percentage"
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">Item Performance</CardTitle>
              <span className="text-xs text-muted-foreground">
                {report.item_performance.length} items
              </span>
            </CardHeader>
            <CardContent>
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Qty Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.item_performance.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity_sold}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.cost)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              safeNumber(item.margin_percentage) >= 0
                                ? "text-emerald-600"
                                : "text-red-600"
                            }
                          >
                            {safeNumber(item.margin_percentage).toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">Category Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.category_performance.map((cat) => (
                  <div key={cat.category} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{cat.category}</span>
                      <span className="text-muted-foreground">
                        {cat.items_count} items · {cat.total_sold} sold
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{
                          width: `${Math.min(100, (cat.total_revenue / (report.category_performance[0]?.total_revenue || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatCurrency(cat.total_revenue)}</span>
                      <span>{safeNumber(cat.average_margin).toFixed(1)}% margin</span>
                    </div>
                  </div>
                ))}
              </div>
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
