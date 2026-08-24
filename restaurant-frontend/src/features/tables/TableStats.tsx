"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, CircleCheck, Clock, Sparkles, Wrench } from "lucide-react";
import type { Table, TableStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  TableStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  available: {
    label: "Available",
    icon: CircleCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
  },
  occupied: {
    label: "Occupied",
    icon: Users,
    color: "text-red-600",
    bg: "bg-red-500/10",
  },
  reserved: {
    label: "Reserved",
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-500/10",
  },
  needs_cleaning: {
    label: "Needs Cleaning",
    icon: Sparkles,
    color: "text-orange-600",
    bg: "bg-orange-500/10",
  },
  maintenance: {
    label: "Maintenance",
    icon: Wrench,
    color: "text-gray-600",
    bg: "bg-gray-500/10",
  },
};

function StatCard({
  status,
  count,
  total,
}: {
  status: TableStatus;
  count: number;
  total: number;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <Card>
      <CardContent className="pt-1">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{config.label}</p>
            <p className="text-2xl font-bold tracking-tight">{count}</p>
            <p className="text-xs text-muted-foreground">{pct}% of total</p>
          </div>
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              config.bg
            )}
          >
            <Icon className={cn("h-5 w-5", config.color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TableStats({ tables }: { tables: Table[] }) {
  const total = tables.length;
  const counts: Record<TableStatus, number> = {
    available: 0,
    occupied: 0,
    reserved: 0,
    needs_cleaning: 0,
    maintenance: 0,
  };

  for (const t of tables) {
    counts[t.status]++;
  }

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
      <StatCard status="available" count={counts.available} total={total} />
      <StatCard status="occupied" count={counts.occupied} total={total} />
      <StatCard status="reserved" count={counts.reserved} total={total} />
      <StatCard status="needs_cleaning" count={counts.needs_cleaning} total={total} />
      <StatCard status="maintenance" count={counts.maintenance} total={total} />
    </div>
  );
}
