"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  ReportFilters,
  ReportSummaryCard,
  TaxBreakdownTable,
  TaxByOrderTypeTable,
  ExportButton,
} from "@/features/reports";
import { useTaxReport } from "@/features/reports/hooks/useReports";
import { formatCurrency } from "@/lib/utils";
import { CHART_TOOLTIP_STYLE } from "@/lib/utils/constants";
import type { ReportPeriod, DateRange } from "@/features/reports/types";
import { LoadingSpinner } from "@/components/shared";
import { ChartEmptyState } from "@/components/shared";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-PH", {
    month: "short",
    year: "2-digit",
  });
}

export default function TaxReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: report, isLoading } = useTaxReport({ period, date_range: dateRange });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Tax Reports"
          description="Tax collected and compliance reports"
        />
        <ExportButton
          reportType="tax"
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
          <div className="grid gap-4 md:grid-cols-1">
            <ReportSummaryCard
              title="Total Tax Collected"
              value={report.total_tax_collected}
              format="currency"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <TaxBreakdownTable data={report.tax_breakdown} />
            <TaxByOrderTypeTable data={report.tax_by_order_type} />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">Monthly Tax Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {report.monthly_tax.length === 0 ? (
                <ChartEmptyState message="No monthly data available" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart
                    data={report.monthly_tax.map((item) => ({
                      ...item,
                      label: formatDate(item.month),
                    }))}
                  >
                    <defs>
                      <linearGradient id="taxGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      width={60}
                      tickFormatter={(v: number) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(value) => [formatCurrency(Number(value)), "Tax Collected"]}
                      labelFormatter={(label) => String(label)}
                    />
                    <Area
                      type="monotone"
                      dataKey="tax_collected"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill="url(#taxGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-muted-foreground">No tax data available.</p>
        </div>
      )}
    </div>
  );
}
