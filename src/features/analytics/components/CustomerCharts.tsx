"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { CHART_TOOLTIP_STYLE, CHART_COLORS } from "@/lib/utils/constants";
import { ChartEmptyState } from "@/components/shared";
import type {
  CustomerSegment,
  TopCustomer,
  VisitTrend,
} from "../types";

interface CustomerVisitTrendProps {
  data: VisitTrend[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

export function CustomerVisitTrend({ data }: CustomerVisitTrendProps) {
  const chartData = data.map((item) => ({
    ...item,
    label: formatDate(item.date),
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Customer Visit Trends</CardTitle>
      </CardHeader>
      <CardContent>
          {chartData.length === 0 ? (
            <ChartEmptyState />
          ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="returnGrad" x1="0" y1="0" x2="0" y2="1">
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
                width={40}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="new_customers"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#newGrad)"
                name="New Customers"
              />
              <Area
                type="monotone"
                dataKey="returning_customers"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#returnGrad)"
                name="Returning"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

interface CustomerSegmentsProps {
  data: CustomerSegment[];
}

export function CustomerSegments({ data }: CustomerSegmentsProps) {
  const COLORS = CHART_COLORS;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Customer Segments</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">
            No data available
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((segment, index) => (
              <div key={segment.segment} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{segment.segment}</span>
                  <span className="text-muted-foreground">
                    {segment.count} customers ({segment.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${segment.percentage}%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Avg spend: {formatCurrency(segment.average_spend)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TopCustomersTableProps {
  data: TopCustomer[];
}

export function TopCustomersTable({ data }: TopCustomersTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Top Customers</CardTitle>
        <span className="text-xs text-muted-foreground">{data.length} customers</span>
      </CardHeader>
      <CardContent>
          {data.length === 0 ? (
            <ChartEmptyState height={100} message="No customer data available" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead className="text-right">Last Visit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((customer, index) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-xs text-muted-foreground">{customer.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{customer.total_orders}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(customer.total_spent)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {new Date(customer.last_visit).toLocaleDateString("en-PH")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
