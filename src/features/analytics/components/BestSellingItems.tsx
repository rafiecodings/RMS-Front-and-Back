"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { CHART_TOOLTIP_STYLE, CHART_COLORS } from "@/lib/utils/constants";
import { ChartEmptyState } from "@/components/shared";

interface BestSellingItemsProps {
  data: {
    id: string;
    name: string;
    category: string;
    quantity_sold: number;
    revenue: number;
  }[];
  limit?: number;
}

const COLORS = CHART_COLORS;

export function BestSellingItems({ data, limit = 10 }: BestSellingItemsProps) {
  const items = data.slice(0, limit);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Best Selling Items</CardTitle>
        <span className="text-xs text-muted-foreground">Top {limit}</span>
      </CardHeader>
      <CardContent>
          {items.length === 0 ? (
            <ChartEmptyState />
          ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={items} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={120}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value, name) => [
                  name === "quantity_sold" ? `${value} units` : formatCurrency(Number(value)),
                  name === "quantity_sold" ? "Quantity" : "Revenue",
                ]}
              />
              <Bar dataKey="quantity_sold" radius={[0, 4, 4, 0]}>
                {items.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
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
