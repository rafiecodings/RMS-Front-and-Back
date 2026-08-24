"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, safeNumber } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { ChartEmptyState } from "@/components/shared";
import type { HourlyDistribution } from "../types";

interface PeakHoursHeatmapProps {
  data: HourlyDistribution[];
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function getIntensity(value: number, max: number): string {
  if (max === 0) return "bg-muted";
  const ratio = value / max;
  if (ratio === 0) return "bg-muted";
  if (ratio < 0.2) return "bg-emerald-100 dark:bg-emerald-900/30";
  if (ratio < 0.4) return "bg-emerald-200 dark:bg-emerald-800/30";
  if (ratio < 0.6) return "bg-emerald-300 dark:bg-emerald-700/30";
  if (ratio < 0.8) return "bg-emerald-400 dark:bg-emerald-600/30";
  return "bg-emerald-500 dark:bg-emerald-500/30";
}

export function PeakHoursHeatmap({ data }: PeakHoursHeatmapProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Peak Hours Heatmap</CardTitle>
          <span className="text-xs text-muted-foreground">Orders by hour & day</span>
        </CardHeader>
        <CardContent>
          <ChartEmptyState />
        </CardContent>
      </Card>
    );
  }

  const maxVal = Math.max(
    ...data.flatMap((d) => DAYS.map((day) => d[day as keyof HourlyDistribution] as number))
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Peak Hours Heatmap</CardTitle>
        <span className="text-xs text-muted-foreground">Orders by hour & day</span>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="p-1 text-left text-xs font-medium text-muted-foreground w-12">
                    Hour
                  </th>
                  {DAYS.map((day) => (
                    <th
                      key={day}
                      className="p-1 text-center text-xs font-medium text-muted-foreground capitalize"
                    >
                      {day.slice(0, 3)}
                    </th>
                  ))}
                  <th className="p-1 text-center text-xs font-medium text-muted-foreground">
                    Avg
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.hour}>
                    <td className="p-1 text-xs text-muted-foreground">
                      {row.label}
                    </td>
                    {DAYS.map((day) => {
                      const val = row[day as keyof HourlyDistribution] as number;
                      return (
                        <td key={day} className="p-0.5">
                          <div
                            className={cn(
                              "h-8 w-full rounded-sm flex items-center justify-center text-[10px] font-medium transition-colors hover:ring-2 hover:ring-primary/50",
                              getIntensity(val, maxVal)
                            )}
                            title={`${day} ${row.label}: ${val} orders`}
                          >
                            {val > 0 ? val : ""}
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-0.5">
                      <div className="h-8 w-full rounded-sm flex items-center justify-center text-[10px] font-medium bg-muted">
                        {safeNumber(row.average).toFixed(0)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </CardContent>
    </Card>
  );
}

interface PeakHoursBarProps {
  data: { hour: number; orders: number; revenue: number }[];
}

export function PeakHoursBar({ data }: PeakHoursBarProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Hourly Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartEmptyState />
        </CardContent>
      </Card>
    );
  }

  const maxOrders = Math.max(...data.map((d) => d.orders), 1);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Hourly Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-[200px]">
            {data.map((item) => {
              const height = (item.orders / maxOrders) * 100;
              return (
                <div
                  key={item.hour}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full bg-emerald-500 rounded-t transition-all hover:bg-emerald-600"
                    style={{ height: `${height}%` }}
                    title={`${item.hour}:00 - ${item.orders} orders (${formatCurrency(item.revenue)})`}
                  />
                  <span className="text-[8px] text-muted-foreground">
                    {item.hour}
                  </span>
                </div>
              );
            })}
          </div>
      </CardContent>
    </Card>
  );
}
