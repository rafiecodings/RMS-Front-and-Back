"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { CHART_TOOLTIP_STYLE } from "@/lib/utils/constants";
import { ChartEmptyState } from "@/components/shared";
import type { ForecastPrediction } from "../types";

interface ForecastChartProps {
  data: ForecastPrediction[];
}

const SERIES_LABELS: Record<string, string> = {
  qty: "Forecast",
  upper_ci: "Upper CI",
  lower_ci: "Lower CI",
};

export function ForecastChart({ data }: ForecastChartProps) {
  const [fullscreen, setFullscreen] = useState(false);

  const chartData = data.map((item) => ({
    ...item,
    label: formatDate(item.date),
  }));

  const chart = (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={chartData}>
        <defs>
          <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={50}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value, name) => [
            Number(value).toFixed(1),
            SERIES_LABELS[String(name)] ?? String(name),
          ]}
          labelFormatter={(label) => String(label)}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="qty"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#forecastGrad)"
          name="qty"
        />
        <Line
          type="monotone"
          dataKey="upper_ci"
          stroke="#94a3b8"
          strokeWidth={1}
          strokeDasharray="4 4"
          dot={false}
          name="upper_ci"
        />
        <Line
          type="monotone"
          dataKey="lower_ci"
          stroke="#94a3b8"
          strokeWidth={1}
          strokeDasharray="4 4"
          dot={false}
          name="lower_ci"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">
            Daily Demand Forecast
          </CardTitle>
          <Button variant="ghost" size="icon-xs" onClick={() => setFullscreen(true)}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? <ChartEmptyState /> : chart}
        </CardContent>
      </Card>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Daily Demand Forecast</DialogTitle>
          </DialogHeader>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="forecastGradFs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value, name) => [
                    Number(value).toFixed(1),
                    SERIES_LABELS[String(name)] ?? String(name),
                  ]}
                  labelFormatter={(label) => String(label)}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="qty"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#forecastGradFs)"
                  name="qty"
                />
                <Line
                  type="monotone"
                  dataKey="upper_ci"
                  stroke="#94a3b8"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                  name="upper_ci"
                />
                <Line
                  type="monotone"
                  dataKey="lower_ci"
                  stroke="#94a3b8"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                  name="lower_ci"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
