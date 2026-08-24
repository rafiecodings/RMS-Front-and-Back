"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartDataItem = Record<string, any>;

interface DrillDownChartProps {
  title: string;
  data: ChartDataItem[];
  dataKey: string;
  nameKey: string;
  colors?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onDrillDown?: (item: any) => void;
  formatValue?: (value: number) => string;
}

const DEFAULT_COLORS = [...CHART_COLORS];

export function DrillDownChart({
  title,
  data,
  dataKey,
  nameKey,
  colors = DEFAULT_COLORS,
  onDrillDown,
  formatValue,
}: DrillDownChartProps) {
  const [drillStack, setDrillStack] = useState<ChartDataItem[][]>([]);
  const [currentData, setCurrentData] = useState(data);
  const [currentTitle, setCurrentTitle] = useState(title);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (item: any) => {
    if (onDrillDown) {
      setDrillStack((prev) => [...prev, currentData]);
      setCurrentData([item]);
      setCurrentTitle(`${title} - ${String(item[nameKey])}`);
      onDrillDown(item);
    }
  };

  const handleBack = () => {
    if (drillStack.length > 0) {
      const prev = drillStack[drillStack.length - 1];
      setDrillStack((s) => s.slice(0, -1));
      setCurrentData(prev);
      setCurrentTitle(title);
    }
  };

  const formatFn = formatValue || ((v: number) => formatCurrency(v));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          {drillStack.length > 0 && (
            <Button variant="ghost" size="icon-xs" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <CardTitle className="text-base font-semibold">{currentTitle}</CardTitle>
        </div>
        <span className="text-xs text-muted-foreground">
          {onDrillDown ? "Click to drill down" : ""}
        </span>
      </CardHeader>
      <CardContent>
          {currentData.length === 0 ? (
            <ChartEmptyState />
          ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={currentData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey={nameKey}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={60}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value) => [formatFn(Number(value)), dataKey]}
                labelFormatter={(label) => String(label)}
              />
              <Bar
                dataKey={dataKey}
                radius={[4, 4, 0, 0]}
                onClick={onDrillDown ? handleClick : undefined}
                cursor={onDrillDown ? "pointer" : "default"}
              >
                {currentData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
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
