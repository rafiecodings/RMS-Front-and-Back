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
} from "@/features/dashboard";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useDashboard } from "@/lib/hooks";
import { useAuth } from "@/providers/AuthProvider";
import {
  DemandForecastCard,
  InventoryForecastCard,
} from "@/features/reports";

const PeakHoursChart = dynamic(
  () => import("@/features/dashboard").then((m) => ({ default: m.PeakHoursChart })),
  { loading: () => <div className="animate-pulse rounded-2xl bg-muted h-[300px]" /> }
);
const RevenueChart = dynamic(
  () => import("@/features/dashboard").then((m) => ({ default: m.RevenueChart })),
  { loading: () => <div className="animate-pulse rounded-2xl bg-muted h-[350px]" /> }
);
const TopSellingItems = dynamic(
  () => import("@/features/dashboard").then((m) => ({ default: m.TopSellingItems })),
  { loading: () => <div className="animate-pulse rounded-2xl bg-muted h-[250px]" /> }
);

// Normalization now lives in `useDashboard` (src/features/dashboard/normalizer.ts)
// so the page never consumes a raw/unsafe payload.

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role ?? "waiter";
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

  // Render role-specific dashboard content
  function renderDashboardContent() {
    switch (role) {
      case "admin":
        return (
          <div className="space-y-8">
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
              <TableOccupancy data={safeData} />
              <InventoryAlerts data={safeData} />
            </div>
            {/* AI / FORECAST */}
            <DemandForecastCard />
            <InventoryForecastCard />
            <div className="grid gap-8 lg:grid-cols-2">
              <TopSellingItems data={safeData} />
              <PeakHoursChart data={safeData} />
            </div>
            <div>
              <RecentActivity data={safeData} />
            </div>
          </div>
        );
      case "manager":
        return (
          <div className="space-y-8">
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
              <TableOccupancy data={safeData} />
              <InventoryAlerts data={safeData} />
            </div>
            {/* AI / FORECAST */}
            <DemandForecastCard />
            <InventoryForecastCard />
            <div className="grid gap-8 lg:grid-cols-2">
              <TopSellingItems data={safeData} />
              <PeakHoursChart data={safeData} />
            </div>
            <div>
              <RecentActivity data={safeData} />
            </div>
          </div>
        );
      case "inventory_staff":
        return (
          <div className="space-y-8">
            <InventoryForecastCard />
            <InventoryAlerts data={safeData} />
          </div>
        );
      case "waiter":
        return (
          <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <TableOccupancy data={safeData} />
              <RecentOrders data={safeData} />
            </div>
            <div className="grid gap-8 lg:grid-cols-2">
              <KitchenQueue data={safeData} />
            </div>
          </div>
        );
      case "cashier":
        // No revenue/financial summaries — not authorized for this role.
        return (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <RecentOrders data={safeData} />
              <TableOccupancy data={safeData} />
            </div>
          </div>
        );
      case "kitchen_staff":
        return (
          <div className="space-y-6">
            <KitchenQueue data={safeData} />
            <RecentOrders data={safeData} />
          </div>
        );
      default:
        return (
          <div className="space-y-8">
            <div className="text-center py-12 text-muted-foreground">
              No dashboard configured for this role.
            </div>
          </div>
        );
    }
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

      {renderDashboardContent()}
    </div>
  );
}
