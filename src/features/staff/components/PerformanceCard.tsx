"use client";

import { Star, TrendingUp, Clock, Award } from "lucide-react";
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
      value: performance.orders_handled,
      icon: TrendingUp,
      color: "bg-blue-100 text-blue-700",
      sub: `${performance.tables_served} tables served`,
    },
    {
      label: "Average Rating",
      value: safeNumber(performance.average_rating).toFixed(1),
      icon: Star,
      color: "bg-amber-100 text-amber-700",
      sub: `${performance.customer_feedback_count} reviews`,
    },
    {
      label: "Attendance Rate",
      value: `${safeNumber(performance.attendance_rate).toFixed(0)}%`,
      icon: Clock,
      color: "bg-emerald-100 text-emerald-700",
      sub: `Punctuality: ${safeNumber(performance.punctuality_score).toFixed(0)}%`,
    },
    {
      label: "Tips Earned",
      value: `₱${safeNumber(performance.tips_earned).toLocaleString()}`,
      icon: Award,
      color: "bg-purple-100 text-purple-700",
      sub: `₱${safeNumber(performance.total_sales).toLocaleString()} total sales`,
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
