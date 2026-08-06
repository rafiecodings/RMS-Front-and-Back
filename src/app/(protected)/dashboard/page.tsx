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

// Normalization now lives in `useDashboard` (src/features/dashboard/normalizer.ts)
// so the page never consumes a raw/unsafe payload.

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboard();

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

  if (!data) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Overview of your restaurant" />
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">No dashboard data available.</div>
        </div>
      </div>
    );
  }

  const safeData = data;

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
