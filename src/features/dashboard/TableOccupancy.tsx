"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardSummary } from "@/lib/types";

export function TableOccupancy({ data }: { data: DashboardSummary }) {
  const { tables } = data;
  const occupancyPercent = tables.total > 0
    ? Math.round((tables.occupied / tables.total) * 100)
    : 0;

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Table Occupancy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 bg-red-500 transition-all duration-500"
            style={{ width: `${occupancyPercent}%` }}
          />
          <div
            className="absolute inset-y-0 bg-amber-500 transition-all duration-500"
            style={{
              left: `${occupancyPercent}%`,
              width: `${tables.total > 0 ? (tables.reserved / tables.total) * 100 : 0}%`,
            }}
          />
          <div
            className="absolute inset-y-0 bg-emerald-500 transition-all duration-500"
            style={{
              left: `${occupancyPercent + (tables.total > 0 ? (tables.reserved / tables.total) * 100 : 0)}%`,
              width: `${tables.total > 0 ? (tables.available / tables.total) * 100 : 0}%`,
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatusBlock
            count={tables.available}
            label="Available"
            dotColor="bg-emerald-500"
          />
          <StatusBlock
            count={tables.occupied}
            label="Occupied"
            dotColor="bg-red-500"
          />
          <StatusBlock
            count={tables.reserved}
            label="Reserved"
            dotColor="bg-amber-500"
          />
          <StatusBlock
            count={tables.needs_cleaning}
            label="Cleaning"
            dotColor="bg-orange-500"
          />
          <StatusBlock
            count={tables.maintenance}
            label="Maintenance"
            dotColor="bg-gray-400"
          />
          <StatusBlock
            count={tables.total}
            label="Total"
            dotColor="bg-primary"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBlock({
  count,
  label,
  dotColor,
}: {
  count: number;
  label: string;
  dotColor: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${dotColor}`} />
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="ml-auto text-sm font-semibold">{count}</span>
    </div>
  );
}
