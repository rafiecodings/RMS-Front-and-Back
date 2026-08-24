"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { WastageSummary } from "../types";

interface WastageSummaryCardProps {
  data: WastageSummary;
}

export function WastageSummaryCard({ data }: WastageSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Wastage Summary</CardTitle>
        <span className="text-sm font-medium text-red-600">
          {formatCurrency(data.total_wastage_cost)}
        </span>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <p className="text-2xl font-bold">{data.total_wastage_count}</p>
          <p className="text-xs text-muted-foreground">recorded wastage events in period</p>
        </div>
        {data.by_reason.length > 0 && (
          <div className="mt-4 space-y-2">
            {data.by_reason.map((item) => (
              <div key={item.reason} className="flex items-center justify-between text-sm">
                <span className="capitalize">{item.reason.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground">
                  {item.count}× · {item.quantity} units · {formatCurrency(item.cost)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
