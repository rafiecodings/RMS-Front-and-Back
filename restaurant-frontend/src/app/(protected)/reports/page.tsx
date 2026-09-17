"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, LoadingSpinner, ErrorState } from "@/components/shared";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Package,
  BarChart3,
  Receipt,
  ClipboardList,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import {
  ReportFilters,
  ReportSummaryCard,
  RevenueChart,
  RevenueByPaymentChart,
  AiInsightsPanel,
  DemandForecastCard,
  InventoryForecastCard,
  ExportButton,
} from "@/features/reports";
import {
  useRevenueReport,
  useSalesReport,
  useInventoryReport,
} from "@/features/reports/hooks/useReports";
import type { ReportPeriod, DateRange } from "@/features/reports/types";
import { resolveReportRange } from "@/features/reports/utils/resolveReportRange";
import { useAuth } from "@/providers/AuthProvider";

const REPORT_LINKS = [
  {
    title: "Revenue",
    description: "Daily revenue and order trends",
    icon: BarChart3,
    href: "/reports/revenue",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Sales",
    description: "Breakdown by type, payment, hour, item",
    icon: ShoppingCart,
    href: "/reports/sales",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-500/10",
  },
  {
    title: "Menu Performance",
    description: "Best and lowest selling items",
    icon: Receipt,
    href: "/reports/menu",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  {
    title: "Inventory",
    description: "Stock value, wastage, low stock alerts",
    icon: Package,
    href: "/reports/inventory",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-500/10",
  },
  {
    title: "Tax",
    description: "Tax collected by day and month",
    icon: ClipboardList,
    href: "/reports/tax",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
  },
];

export default function ReportsPage() {
  const { user } = useAuth();
  // Inventory restock risk is restricted to admin/manager/inventory_staff.
  const canViewInventoryForecast = ["admin", "manager", "inventory_staff"].includes(
    user?.role ?? ""
  );
  const [period, setPeriod] = useState<ReportPeriod>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const filters = useMemo(() => ({ period, date_range: dateRange }), [period, dateRange]);

  const range = useMemo(
    () => resolveReportRange(period, dateRange),
    [period, dateRange],
  );

  const revenue = useRevenueReport(filters);
  const sales = useSalesReport(filters);
  const inventory = useInventoryReport(filters);

  const anyLoading =
    revenue.isLoading || sales.isLoading || inventory.isLoading;
  const anyError =
    revenue.isError || sales.isError || inventory.isError;

  function handleRefresh() {
    revenue.refetch();
    sales.refetch();
    inventory.refetch();
  }

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Reports & Analytics"
        description="Restaurant performance overview"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={anyLoading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${anyLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <ExportButton reportType="revenue" period={period} dateRange={dateRange} />
          </div>
        }
      />

      <ReportFilters
        period={period}
        dateRange={dateRange}
        onPeriodChange={setPeriod}
        onDateRangeChange={setDateRange}
      />

      {/* KPI ROW */}
      {anyLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : anyError ? (
        <ErrorState
          message="Failed to load reports. Please try again."
          onRetry={handleRefresh}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 min-w-0">
            <ReportSummaryCard
              title="Revenue"
              value={revenue.data?.total_revenue ?? 0}
              format="currency"
              change={revenue.data?.revenue_growth}
            />
            <ReportSummaryCard
              title="Orders"
              value={revenue.data?.total_orders ?? 0}
              format="number"
            />
            <ReportSummaryCard
              title="Average Order"
              value={sales.data?.average_ticket ?? 0}
              format="currency"
            />
            <ReportSummaryCard
              title="Sales Growth"
              value={sales.data?.sales_growth ?? 0}
              format="percentage"
              change={sales.data?.sales_growth}
              subtitle={
                sales.data?.sales_growth == null
                  ? "No comparable previous period"
                  : undefined
              }
            />
          </div>

          {/* SALES ANALYTICS */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Sales Analytics
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <RevenueChart data={revenue.data?.daily_revenue ?? []} />
              <RevenueByPaymentChart data={sales.data?.revenue_by_payment ?? []} />
            </div>
          </section>

          {/* AI / FORECAST */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              AI / Forecast
            </h2>
            <DemandForecastCard />
            {canViewInventoryForecast && <InventoryForecastCard />}
            <AiInsightsPanel startDate={range.start_date} endDate={range.end_date} />
          </section>

          {/* INVENTORY SUMMARY */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Inventory Health
            </h2>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3 min-w-0">
              <ReportSummaryCard
                title="Stock Value"
                value={inventory.data?.total_stock_value ?? 0}
                format="currency"
              />
              <ReportSummaryCard
                title="Low Stock Items"
                value={inventory.data?.low_stock_count ?? 0}
                format="number"
              />
              <ReportSummaryCard
                title="Wastage Cost (period)"
                value={inventory.data?.wastage_summary.total_wastage_cost ?? 0}
                format="currency"
              />
            </div>
          </section>

          {/* BUSINESS REPORTS LINKS */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Business Reports
            </h2>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 min-w-0">
              {REPORT_LINKS.map((report) => {
                const Icon = report.icon;
                return (
                  <Link key={report.title} href={report.href}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                      <CardContent className="flex items-center gap-4 p-5">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${report.bgColor}`}
                        >
                          <Icon className={`h-5 w-5 ${report.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base">{report.title}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {report.description}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
