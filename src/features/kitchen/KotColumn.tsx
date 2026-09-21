"use client";

import { Badge } from "@/components/ui/badge";
import { KotCard } from "./KotCard";
import type { Kot, KotStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface KotColumnProps {
  title: string;
  status: KotStatus;
  kots: Kot[];
  count: number;
  onStatusAdvance: (kot: Kot) => void;
  onViewDetail: (kot: Kot) => void;
  onArchive: (kot: Kot) => void;
}

const COLUMN_HEADER_STYLES: Record<KotStatus, string> = {
  received: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
  pending: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
  in_progress:
    "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
  ready:
    "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
  completed:
    "bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800",
  voided: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
};

const COLUMN_DOT: Record<KotStatus, string> = {
  received: "bg-blue-500",
  pending: "bg-blue-500",
  in_progress: "bg-amber-500",
  ready: "bg-emerald-500",
  completed: "bg-gray-400",
  voided: "bg-red-400",
};

function toTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export function KotColumn({
  title,
  status,
  kots,
  count,
  onStatusAdvance,
  onViewDetail,
  onArchive,
}: KotColumnProps) {
  const sorted = [...kots].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const aPriority = priorityOrder[a.priority] ?? 2;
    const bPriority = priorityOrder[b.priority] ?? 2;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return toTimestamp(a.created_at) - toTimestamp(b.created_at);
  });

  return (
    <div className="flex flex-col min-w-[280px] w-[85vw] sm:w-80 sm:min-w-[280px] flex-1 snap-start shrink-0">
      {/* Column Header */}
      <div
        className={cn(
          "flex items-center justify-between rounded-t-lg border-b px-4 py-3",
          COLUMN_HEADER_STYLES[status]
        )}
      >
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", COLUMN_DOT[status])} />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <Badge variant="secondary" className="text-xs font-bold px-2 py-0">
          {count}
        </Badge>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto rounded-b-lg border border-t-0 bg-muted/20">
        <div className="p-2 space-y-2 min-h-[200px]">
          {sorted.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-xs text-muted-foreground">
              No tickets
            </div>
          ) : (
            sorted.map((kot) => (
              <KotCard
                key={kot.id}
                kot={kot}
                onStatusAdvance={onStatusAdvance}
                onViewDetail={onViewDetail}
                onArchive={onArchive}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
