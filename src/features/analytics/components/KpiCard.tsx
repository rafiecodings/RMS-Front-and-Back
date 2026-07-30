"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type { ReactNode } from "react";

interface KpiCardProps {
  title: string;
  value: number;
  format?: "currency" | "number" | "percentage" | "hours";
  change?: number;
  icon?: ReactNode;
  subtitle?: string;
}

export const KpiCard = memo(function KpiCard({
  title,
  value,
  format: fmt = "currency",
  change,
  icon,
  subtitle,
}: KpiCardProps) {
  const formattedValue =
    fmt === "currency"
      ? formatCurrency(value)
      : fmt === "percentage"
        ? `${value.toFixed(1)}%`
        : fmt === "hours"
          ? `${value.toFixed(1)}h`
          : value.toLocaleString();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <div className="text-2xl font-bold">{formattedValue}</div>
          {change !== undefined && (
            <div
              className={cn(
                "flex items-center text-xs font-medium mb-1",
                change > 0 && "text-emerald-600",
                change < 0 && "text-red-600",
                change === 0 && "text-muted-foreground"
              )}
            >
              {change > 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : change < 0 ? (
                <TrendingDown className="mr-1 h-3 w-3" />
              ) : (
                <Minus className="mr-1 h-3 w-3" />
              )}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
});
