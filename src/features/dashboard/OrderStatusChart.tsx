"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { DashboardSummary } from "@/lib/types";
import { CHART_TOOLTIP_STYLE } from "@/lib/utils/constants";
import { ChartEmptyState } from "@/components/shared";

const STATUS_COLORS: Record<string, string> = {
  pending: "#3b82f6",
  on_hold: "#eab308",
  confirmed: "#6366f1",
  preparing: "#f59e0b",
  ready: "#10b981",
  served: "#8b5cf6",
  completed: "#22c55e",
  cancelled: "#ef4444",
  voided: "#6b7280",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  on_hold: "On Hold",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  completed: "Completed",
  cancelled: "Cancelled",
  voided: "Voided",
};

export function OrderStatusChart({ data }: { data: DashboardSummary }) {
  const chartData = data.orders.status_breakdown.map((item) => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    color: STATUS_COLORS[item.status] || "#6b7280",
  }));

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Order Status</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <ChartEmptyState message="No orders today" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
