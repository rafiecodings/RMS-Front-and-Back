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
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { StockValuation } from "../types";

interface InventoryTableProps {
  data: StockValuation[];
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ok: { label: "In Stock", variant: "default" },
  low: { label: "Low", variant: "secondary" },
  critical: { label: "Critical", variant: "destructive" },
  out_of_stock: { label: "Out of Stock", variant: "destructive" },
};

export function InventoryTable({ data }: InventoryTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Stock Valuation</CardTitle>
        <span className="text-xs text-muted-foreground">
          {data.length} ingredients
        </span>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[100px] items-center justify-center text-muted-foreground text-sm">
            No inventory data available
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => {
                  const status = statusConfig[item.status] || statusConfig.ok;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">
                        {item.current_stock} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unit_cost)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.total_value)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
