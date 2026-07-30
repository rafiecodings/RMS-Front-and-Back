"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { CHART_TOOLTIP_STYLE } from "@/lib/utils/constants";
import { ChartEmptyState } from "@/components/shared";
import type { DashboardSummary } from "@/lib/types";

export function TopSellingItems({ data }: { data: DashboardSummary }) {
  const items = data.top_selling_items.slice(0, 8);

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Top Selling Items</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <ChartEmptyState message="No sales data today" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={items}
              layout="vertical"
              margin={{ left: 10, right: 20, top: 0, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value, name) => [
                  name === "revenue" ? formatCurrency(Number(value)) : value,
                  name === "revenue" ? "Revenue" : "Qty Sold",
                ]}
              />
              <Bar
                dataKey="quantity_sold"
                radius={[0, 4, 4, 0]}
                barSize={20}
              >
                {items.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`hsl(${210 + index * 15}, 70%, ${55 - index * 3}%)`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
