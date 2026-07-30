"use client";

import dynamic from "next/dynamic";
import { PageHeader } from "@/components/shared";
import {
  RevenueCards,
  SalesSummary,
  TableOccupancy,
  InventoryAlerts,
  KitchenQueue,
  RecentOrders,
  RecentActivity,
  QuickActions,
} from "@/features/dashboard";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useDashboard } from "@/lib/hooks";
import type { DashboardSummary } from "@/lib/types";

const RevenueChart = dynamic(
  () => import("@/features/dashboard").then((m) => ({ default: m.RevenueChart })),
  { loading: () => <div className="animate-pulse rounded-2xl bg-muted h-[350px]" /> }
);
const OrderStatusChart = dynamic(
  () => import("@/features/dashboard").then((m) => ({ default: m.OrderStatusChart })),
  { loading: () => <div className="animate-pulse rounded-2xl bg-muted h-[350px]" /> }
);
const TopSellingItems = dynamic(
  () => import("@/features/dashboard").then((m) => ({ default: m.TopSellingItems })),
  { loading: () => <div className="animate-pulse rounded-2xl bg-muted h-[250px]" /> }
);
const PeakHoursChart = dynamic(
  () => import("@/features/dashboard").then((m) => ({ default: m.PeakHoursChart })),
  { loading: () => <div className="animate-pulse rounded-2xl bg-muted h-[350px]" /> }
);

function safeSummary(data: DashboardSummary | null | undefined): DashboardSummary {
  const d = data || ({} as DashboardSummary);
  return {
    revenue: d.revenue || { today: 0, yesterday: 0, this_week: 0, this_month: 0, comparison_percentage: 0, daily_breakdown: [] },
    sales: d.sales || { total_today: 0, transaction_count: 0, average_ticket: 0, by_type: [], by_payment: [] },
    orders: d.orders || { total_today: 0, active: 0, completed: 0, cancelled: 0, average_preparation_time: 0, status_breakdown: [] },
    tables: d.tables || { total: 0, available: 0, occupied: 0, reserved: 0, needs_cleaning: 0, maintenance: 0, occupancy_rate: 0 },
    kitchen: d.kitchen || { queue_length: 0, avg_wait_time: 0, orders_in_progress: [] },
    top_selling_items: d.top_selling_items || [],
    peak_hours: d.peak_hours || [],
    alerts: d.alerts || [],
    inventory_alerts: d.inventory_alerts || [],
    recent_orders: d.recent_orders || [],
    recent_activities: d.recent_activities || [],
  };
}

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboard();
  const safeData = safeSummary(data);

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Overview of your restaurant" />
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Overview of your restaurant" />
        <div className="flex items-center justify-center h-64">
          <div className="text-destructive">Failed to load dashboard data. Please try again.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your restaurant"
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
        }
      />

      <div className="space-y-8">
        <QuickActions />

        <RevenueCards data={safeData} />

        <div className="grid gap-8 lg:grid-cols-2">
          <SalesSummary data={safeData} />
          <RevenueChart data={safeData} />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <KitchenQueue data={safeData} />
          <RecentOrders data={safeData} />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <OrderStatusChart data={safeData} />
          <TableOccupancy data={safeData} />
          <InventoryAlerts data={safeData} />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentActivity data={safeData} />
          </div>
          <div>
            <PeakHoursChart data={safeData} />
          </div>
        </div>

        <TopSellingItems data={safeData} />
      </div>
    </div>
  );
}
