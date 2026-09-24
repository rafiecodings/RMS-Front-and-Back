"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  PhilippinePeso,
  CircleAlert,
  RotateCcw,
  TrendingUp,
  ShoppingCart,
  BarChart3,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { BillingStats } from "../types";

interface InvoiceStatsProps {
  stats: BillingStats | undefined;
  isLoading: boolean;
}

function StatCard({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${className}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function InvoiceStats({ stats, isLoading }: InvoiceStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-16 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard
        label="Total Revenue"
        value={formatCurrency(stats.total_revenue)}
        icon={PhilippinePeso}
        className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      />
      <StatCard
        label="Outstanding"
        value={formatCurrency(stats.outstanding_amount)}
        icon={CircleAlert}
        className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
      />
      <StatCard
        label="Total Refunds"
        value={formatCurrency(stats.total_refunds)}
        icon={RotateCcw}
        className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
      />
      <StatCard
        label="Net Revenue"
        value={formatCurrency(stats.net_revenue)}
        icon={TrendingUp}
        className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
      />
      <StatCard
        label="Total Orders"
        value={String(stats.orders_count)}
        icon={ShoppingCart}
        className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
      />
      <StatCard
        label="Avg Order Value"
        value={formatCurrency(stats.avg_order_value)}
        icon={BarChart3}
        className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
      />
    </div>
  );
}
