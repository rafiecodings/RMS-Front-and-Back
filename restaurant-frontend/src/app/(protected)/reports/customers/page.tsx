"use client";

import { useMemo, useState } from "react";
import { PageHeader, LoadingSpinner, ErrorState } from "@/components/shared";
import {
  ReportFilters,
  ReportSummaryCard,
  ExportButton,
} from "@/features/reports";
import { useCustomerReport } from "@/features/reports/hooks/useReports";
import {
  LOYALTY_TIERS,
  LOYALTY_TIER_STYLES,
} from "@/features/reports/utils/loyaltyTiers";
import type { ReportPeriod, DateRange } from "@/features/reports/types";

export default function CustomerReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const filters = useMemo(() => ({ period, date_range: dateRange }), [period, dateRange]);

  const { data: report, isLoading, isError } = useCustomerReport(filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Customer & Loyalty Reports"
          description="Visit frequency, loyalty tiers and top customers — real dining activity only."
        />
        <ExportButton reportType="customers" period={period} dateRange={dateRange} />
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
        <ErrorState message="Failed to load the customer report. Please try again." />
      ) : report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <ReportSummaryCard title="Total Customers" value={report.total_customers} format="number" />
            <ReportSummaryCard title="New (period)" value={report.new_in_period} format="number" />
            <ReportSummaryCard title="Loyal Customers" value={report.loyal_customers} format="number" />
            <ReportSummaryCard title="Avg Lifetime Visits" value={report.avg_visit_count} format="number" />
            <ReportSummaryCard title="Avg Lifetime Spend (visited)" value={report.avg_total_spent} format="currency" />
          </div>

          <p className="text-sm text-muted-foreground">Active customers only. The date range filters new registrations; visits, spending and loyalty tiers are lifetime totals.</p>
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">Loyalty Tiers (auto-derived from visits)</h3>
            <div className="grid gap-3 sm:grid-cols-5 text-sm">
              {LOYALTY_TIERS.map((t) => (
                <div
                  key={t.tier}
                  className={`rounded-md border p-3 ${LOYALTY_TIER_STYLES[t.tier]}`}
                >
                  <p className="font-semibold">{t.tier}</p>
                  <p>{report.loyalty_tiers[t.tier]} customers</p>
                  <p className="text-xs opacity-80">{t.range}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Visits</th>
                  <th className="px-4 py-3 font-medium">Total Spent</th>
                  <th className="px-4 py-3 font-medium">Loyalty Tier</th>
                </tr>
              </thead>
              <tbody>
                {(report.top_customers ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                      No registered customers yet.
                    </td>
                  </tr>
                ) : (
                  (report.top_customers ?? []).map((c) => {
                    const tier = c.loyalty_tier;
                    return (
                      <tr key={c.id} className="border-t">
                        <td className="px-4 py-3">{c.name}</td>
                        <td className="px-4 py-3">{c.visit_count}</td>
                        <td className="px-4 py-3">₱{Number(c.total_spent).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${LOYALTY_TIER_STYLES[tier]}`}>
                            {tier}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
