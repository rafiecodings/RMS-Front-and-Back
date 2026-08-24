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
import type { DemandTrend } from "../types";

interface BestSellingItemRow {
  id: string;
  name: string;
  category: string;
  quantity_sold: number;
  revenue: number;
  forecast_daily_demand?: number;
  trend?: DemandTrend;
}

interface BestSellingItemsProps {
  data: BestSellingItemRow[];
  limit?: number;
}

const COLORS = CHART_COLORS;

const TREND_GLYPH: Record<DemandTrend, { glyph: string; color: string; label: string }> = {
  rising: { glyph: "▲", color: "#059669", label: "Rising" },
  falling: { glyph: "▼", color: "#dc2626", label: "Falling" },
  stable: { glyph: "—", color: "var(--muted-foreground)", label: "Stable" },
};

function TrendLabelTick(props: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  items: BestSellingItemRow[];
}) {
  const { x = 0, y = 0, payload, items } = props;
  const name = payload?.value ?? "";
  const item = items.find((i) => i.name === name);
  const trend = item?.trend ?? "stable";
  const style = TREND_GLYPH[trend];

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-6}
        y={0}
        dy={4}
        textAnchor="end"
        fontSize={9}
        fill={style.color}
        aria-label={`${style.label} demand`}
      >
        {style.glyph}
      </text>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fontSize={10}
        fill="var(--muted-foreground)"
      >
        {name}
      </text>
    </g>
  );
}

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
          <>
            <div className="mb-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="text-emerald-600">▲</span> Rising
              </span>
              <span className="flex items-center gap-1">
                <span className="text-red-600">▼</span> Falling
              </span>
              <span className="flex items-center gap-1">
                <span>—</span> Stable
              </span>
            </div>
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
                  tickLine={false}
                  axisLine={false}
                  width={140}
                  tick={
                    <TrendLabelTick
                      items={items}
                    />
                  }
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value, name) => [
                    name === "quantity_sold" ? `${value} units` : formatCurrency(Number(value)),
                    name === "quantity_sold" ? "Quantity" : "Revenue",
                  ]}
                  labelFormatter={(label) => {
                    const item = items.find((i) => i.name === label);
                    const trend = item?.trend ?? "stable";
                    return `${TREND_GLYPH[trend].glyph} ${label}`;
                  }}
                />
                <Bar dataKey="quantity_sold" radius={[0, 4, 4, 0]}>
                  {items.map((item, index) => {
                    const trend = item.trend ?? "stable";
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          trend === "rising"
                            ? "#059669"
                            : trend === "falling"
                              ? "#dc2626"
                              : COLORS[index % COLORS.length]
                        }
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
