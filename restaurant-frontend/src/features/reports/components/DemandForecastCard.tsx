"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner, ErrorState } from "@/components/shared";
import { TrendingUp, TrendingDown, CalendarDays } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useDemandForecast } from "../hooks/useDemandForecast";
import { CHART_TOOLTIP_STYLE } from "@/lib/utils/constants";

const HORIZONS = [7, 14, 30] as const;

function shortDate(d: string): string {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

/**
 * Demand Forecast card: TimechoAI forecast (via Laravel) of daily orders with
 * an uncertainty band. Forecast ≠ guaranteed future result.
 */
export function DemandForecastCard() {
  const [horizon, setHorizon] = useState<7 | 14 | 30>(7);
  const { data, isLoading, isError, refetch } = useDemandForecast({ horizon });

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <CalendarDays className="h-4 w-4 text-primary" />
            AI Sales Forecast
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Demand Forecast — AI-powered sales demand forecast
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
          {HORIZONS.map((h) => (
            <Button
              key={h}
              variant="ghost"
              size="sm"
              onClick={() => setHorizon(h)}
              className={`h-7 px-2.5 text-xs font-medium ${
                horizon === h
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Next {h} Days
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-14">
            <LoadingSpinner size="default" />
          </div>
        ) : isError ? (
          <ErrorState message="Forecast temporarily unavailable." onRetry={() => refetch()} />
        ) : !data?.available ? (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {data?.reason === "insufficient_history"
                ? "Not enough historical activity yet — forecasts need at least 14 days of orders."
                : "Forecast temporarily unavailable."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Expected Demand</p>
                <p className="text-lg font-bold">
                  {Math.round(
                    data.forecast.reduce((s, d) => s + d.predicted_orders, 0)
                  ).toLocaleString()}{" "}
                  <span className="text-xs font-normal text-muted-foreground">orders</span>
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Forecast Direction</p>
                <p className="flex items-center gap-1 text-lg font-bold capitalize">
                  {data.forecast_direction === "up" ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  {data.forecast_direction ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Highest Forecast Day</p>
                <p className="truncate text-sm font-bold" title={data.highest_day?.date}>
                  {data.highest_day
                    ? `${shortDate(data.highest_day.date)} · ${Math.round(data.highest_day.predicted_orders)}`
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Avg Daily Orders</p>
                <p className="text-lg font-bold">
                  {data.historical_summary?.avg_daily_orders ?? "—"}
                </p>
              </div>
            </div>

            {/* Actual + forecast chart */}
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={data.forecast.map((d) => ({
                  ...d,
                  label: shortDate(d.date),
                }))}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value, name) => [
                    Number(value).toFixed(0),
                    name === "upper" ? "Upper band" : name === "lower" ? "Lower band" : "Predicted orders",
                  ]}
                />
                {data.forecast.some((d) => d.upper_orders != null) && (
                  <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="none"
                    fill="#6366f1"
                    fillOpacity={0.12}
                    name="upper"
                  />
                )}
                {data.forecast.some((d) => d.lower_orders != null) && (
                  <Area
                    type="monotone"
                    dataKey="lower"
                    stroke="none"
                    fill="var(--card)"
                    fillOpacity={1}
                    name="lower"
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="predicted_orders"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#fcGrad)"
                  name="forecast"
                />
              </AreaChart>
            </ResponsiveContainer>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Forecast based on historical restaurant activity — not a guaranteed result.</span>
              {data.cached && <Badge variant="secondary" className="text-[10px]">cached</Badge>}
              {revenueHint(data) && (
                <span>{revenueHint(data)}</span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function revenueHint(data: NonNullable<ReturnType<typeof useDemandForecast>["data"]>): string {
  const rev = data.forecast.reduce((s, d) => s + (d.predicted_revenue ?? 0), 0);
  if (rev <= 0) return "";
  return `Projected revenue ≈ ${formatCurrency(rev)} (${data.horizon}d)`;
}
