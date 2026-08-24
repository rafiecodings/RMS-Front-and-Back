"use client";

import { Package, AlertTriangle, DollarSign } from "lucide-react";
import { LoadingSkeleton } from "@/components/shared";
import { formatCurrency } from "@/lib/utils";

interface IngredientStatsProps {
  stats: {
    total: number;
    lowStock: number;
    totalValue: number;
  } | undefined;
  isLoading: boolean;
}

export function IngredientStats({ stats, isLoading }: IngredientStatsProps) {
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
      label: "Total Ingredients",
      value: stats?.total ?? 0,
      icon: Package,
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    },
    {
      label: "Low Stock",
      value: stats?.lowStock ?? 0,
      icon: AlertTriangle,
      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    },
    {
      label: "Total Inventory Value",
      value: formatCurrency(stats?.totalValue ?? 0),
      icon: DollarSign,
      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
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
