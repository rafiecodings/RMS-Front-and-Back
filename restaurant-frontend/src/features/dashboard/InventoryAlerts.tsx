"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, ArrowRight, AlertTriangle, AlertOctagon, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@/lib/types";

const SEVERITY_CONFIG = {
  low: {
    icon: AlertTriangle,
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    rowBg: "hover:bg-amber-50/50 dark:hover:bg-amber-950/20",
  },
  critical: {
    icon: AlertOctagon,
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    rowBg: "hover:bg-red-50/50 dark:hover:bg-red-950/20",
  },
  out_of_stock: {
    icon: XCircle,
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    rowBg: "hover:bg-red-50/50 dark:hover:bg-red-950/20",
  },
};

export function InventoryAlerts({ data }: { data: DashboardSummary }) {
  const alerts = data.inventory_alerts;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Inventory Alerts</CardTitle>
        <Link
          href="/inventory/ingredients"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View inventory
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex h-[160px] items-center justify-center text-muted-foreground text-sm">
            <Package className="h-4 w-4 mr-2" />
            All stock levels OK
          </div>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {alerts.map((alert) => {
              const config = SEVERITY_CONFIG[alert.severity];
              const Icon = config.icon;
              const pct =
                alert.min_threshold > 0
                  ? Math.round((alert.current_stock / alert.min_threshold) * 100)
                  : 0;

              return (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                    config.rowBg
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                      alert.severity === "out_of_stock"
                        ? "bg-red-100 dark:bg-red-900/40"
                        : alert.severity === "critical"
                          ? "bg-red-100 dark:bg-red-900/40"
                          : "bg-amber-100 dark:bg-amber-900/40"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5",
                        alert.severity === "out_of_stock" || alert.severity === "critical"
                          ? "text-red-500"
                          : "text-amber-500"
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {alert.ingredient_name}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn("text-xs px-1.5 py-0", config.badge)}
                      >
                        {alert.severity === "out_of_stock"
                          ? "Out of stock"
                          : alert.severity === "critical"
                            ? "Critical"
                            : "Low"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {alert.current_stock} {alert.unit} remaining
                      {alert.min_threshold > 0 &&
                        ` (min: ${alert.min_threshold} ${alert.unit})`}
                    </p>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          pct <= 0
                            ? "bg-red-500"
                            : pct <= 50
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
