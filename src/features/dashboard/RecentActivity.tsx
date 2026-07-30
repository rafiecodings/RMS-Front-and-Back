"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShoppingCart,
  CheckCircle2,
  XCircle,
  CalendarCheck,
  Package,
  LogIn,
  LogOutIcon,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import type { DashboardSummary } from "@/lib/types";

const ACTIVITY_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  order_placed: {
    icon: ShoppingCart,
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  },
  order_completed: {
    icon: CheckCircle2,
    color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
  },
  order_cancelled: {
    icon: XCircle,
    color: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
  },
  table_reserved: {
    icon: CalendarCheck,
    color: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
  },
  table_freed: {
    icon: CalendarCheck,
    color: "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
  },
  inventory_low: {
    icon: Package,
    color: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
  },
  staff_clock_in: {
    icon: LogIn,
    color: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
  },
  staff_clock_out: {
    icon: LogOutIcon,
    color: "bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-400",
  },
};

export function RecentActivity({ data }: { data: DashboardSummary }) {
  const activities = data.recent_activities;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex h-[160px] items-center justify-center text-muted-foreground text-sm">
            No recent activity
          </div>
        ) : (
          <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
            {activities.map((item, index) => {
              const config =
                ACTIVITY_CONFIG[item.type] || ACTIVITY_CONFIG.order_placed;
              const Icon = config.icon;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50",
                    index < activities.length - 1 && "border-b border-border/50"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      config.color
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{item.message}</p>
                    {item.details && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.details}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 shrink-0 mt-0.5">
                    {timeAgo(item.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
