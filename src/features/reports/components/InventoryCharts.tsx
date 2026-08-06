"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, safeNumber } from "@/lib/utils";
import type { ConsumptionVariance, WastageSummary, TopSupplier } from "../types";

interface ConsumptionVarianceTableProps {
  data: ConsumptionVariance[];
}

export function ConsumptionVarianceTable({ data }: ConsumptionVarianceTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Consumption Variance</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[100px] items-center justify-center text-muted-foreground text-sm">
            No variance data available
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Cost Impact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
                      {safeNumber(item.expected_usage).toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">
                      {safeNumber(item.actual_usage).toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          item.variance > 0
                            ? "text-red-600"
                            : item.variance < 0
                              ? "text-emerald-600"
                              : "text-muted-foreground"
                        }
                      >
                        {item.variance > 0 ? "+" : ""}
                        {safeNumber(item.variance).toFixed(1)} ({safeNumber(item.variance_percentage).toFixed(1)}%)
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.cost_impact)}
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

interface WastageSummaryCardProps {
  data: WastageSummary;
}

export function WastageSummaryCard({ data }: WastageSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Wastage Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Wastage</p>
            <p className="text-2xl font-bold">{data.total_wastage_count}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Cost</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(data.total_wastage_cost)}
            </p>
          </div>
        </div>
        {data.by_reason.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">By Reason</p>
            {data.by_reason.map((item) => (
              <div key={item.reason} className="flex justify-between text-sm">
                <span className="text-muted-foreground capitalize">
                  {item.reason.replace(/_/g, " ")}
                </span>
                <span>
                  {item.count} items ({formatCurrency(item.cost)})
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TopSuppliersTableProps {
  data: TopSupplier[];
}

export function TopSuppliersTable({ data }: TopSuppliersTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Top Suppliers</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[100px] items-center justify-center text-muted-foreground text-sm">
            No supplier data available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total Purchased</TableHead>
                <TableHead className="text-right">Avg Delivery</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{item.orders_count}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.total_purchased)}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.average_delivery_days} days
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
