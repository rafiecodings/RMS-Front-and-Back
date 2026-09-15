"use client";

import { TrendingUp, Clock, Wallet, CalendarCheck } from "lucide-react";
import { LoadingSkeleton } from "@/components/shared";
import { safeNumber } from "@/lib/utils";
import type { StaffPerformance } from "@/lib/types";

interface PerformanceCardProps {
  performance: StaffPerformance | undefined;
  isLoading: boolean;
}

export function PerformanceCard({ performance, isLoading }: PerformanceCardProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <LoadingSkeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  if (!performance) {
    return (
      <div className="rounded-lg border p-6 text-center text-muted-foreground">
        No performance data available
      </div>
    );
  }

  const items = [
    {
      label: "Orders Handled",
      value: safeNumber(performance.orders_handled).toLocaleString(),
      icon: TrendingUp,
      color: "bg-blue-100 text-blue-700",
      sub: `Period ${performance.period.start_date} to ${performance.period.end_date}`,
    },
    {
      label: "Total Sales",
      value: `₱${safeNumber(performance.total_sales).toLocaleString()}`,
      icon: Wallet,
      color: "bg-purple-100 text-purple-700",
      sub: `${performance.staff.employee_id}${performance.staff.name ? ` — ${performance.staff.name}` : ""}`,
    },
    {
      label: "Hours Worked",
      value: `${safeNumber(performance.hours_worked).toFixed(1)}h`,
      icon: Clock,
      color: "bg-emerald-100 text-emerald-700",
      sub: `${performance.days_present} days present`,
    },
    {
      label: "Days Present",
      value: performance.days_present,
      icon: CalendarCheck,
      color: "bg-amber-100 text-amber-700",
      sub: "From clock-in records",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
              <item.icon className="h-4 w-4" />
            </div>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
          <p className="text-2xl font-bold">{item.value}</p>
          <p className="text-xs text-muted-foreground">{item.sub}</p>
        </div>
      ))}
    </div>
  );
}
