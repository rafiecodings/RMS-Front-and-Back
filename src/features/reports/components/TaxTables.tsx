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
import { formatCurrency } from "@/lib/utils";
import type { TaxBreakdown, TaxByOrderType } from "../types";

interface TaxBreakdownTableProps {
  data: TaxBreakdown[];
}

export function TaxBreakdownTable({ data }: TaxBreakdownTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Tax Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[100px] items-center justify-center text-muted-foreground text-sm">
            No tax data available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tax Type</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Taxable Amount</TableHead>
                <TableHead className="text-right">Tax Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.tax_type}>
                  <TableCell className="font-medium capitalize">
                    {item.tax_type.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="text-right">{item.rate}%</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.taxable_amount)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.tax_amount)}
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

interface TaxByOrderTypeTableProps {
  data: TaxByOrderType[];
}

export function TaxByOrderTypeTable({ data }: TaxByOrderTypeTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Tax by Order Type</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[100px] items-center justify-center text-muted-foreground text-sm">
            No data available
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((item) => (
              <div key={item.order_type} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize font-medium">
                    {item.order_type.replace(/_/g, " ")}
                  </span>
                  <span>{formatCurrency(item.tax_collected)}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
