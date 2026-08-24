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
import type { TopSalesItem } from "../types";

interface TopItemsTableProps {
  data: TopSalesItem[];
  title?: string;
  variant?: "top" | "bottom";
}

export function TopItemsTable({
  data,
  title = "Top Selling Items",
  variant = "top",
}: TopItemsTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <Badge variant={variant === "top" ? "default" : "secondary"}>
          {data.length} items
        </Badge>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[100px] items-center justify-center text-muted-foreground text-sm">
            No data available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Qty Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{item.quantity_sold}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.revenue)}
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
