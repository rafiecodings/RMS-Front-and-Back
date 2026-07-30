"use client";

import { Users, UserCheck, Clock, Star } from "lucide-react";
import { LoadingSkeleton } from "@/components/shared";
import type { StaffStatsData } from "@/lib/types";

interface StaffStatsProps {
  stats: StaffStatsData | undefined;
  isLoading: boolean;
}

export function StaffStats({ stats, isLoading }: StaffStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <LoadingSkeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const items = [
    {
      label: "Total Staff",
      value: stats?.totalStaff ?? 0,
      icon: Users,
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    },
    {
      label: "Active Staff",
      value: stats?.activeStaff ?? 0,
      icon: UserCheck,
      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    },
    {
      label: "On Shift Today",
      value: stats?.onShiftToday ?? 0,
      icon: Clock,
      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    },
    {
      label: "Avg. Rating",
      value: stats?.averageRating != null ? stats.averageRating.toFixed(1) : "—",
      icon: Star,
      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-4 rounded-lg border p-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
            <item.icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="text-2xl font-bold">{item.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
