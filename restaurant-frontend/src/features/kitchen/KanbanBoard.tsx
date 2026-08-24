"use client";

import { KotColumn } from "./KotColumn";
import type { Kot, KotStatus } from "@/lib/types";

interface KanbanBoardProps {
  kots: Kot[];
  onStatusAdvance: (kot: Kot) => void;
  onViewDetail: (kot: Kot) => void;
  onArchive: (kot: Kot) => void;
}

const COLUMNS: { title: string; statuses: KotStatus[] }[] = [
  { title: "NEW ORDERS", statuses: ["received"] },
  { title: "PREPARING", statuses: ["in_progress"] },
  { title: "READY", statuses: ["ready", "completed"] },
];

export function KanbanBoard({
  kots,
  onStatusAdvance,
  onViewDetail,
  onArchive,
}: KanbanBoardProps) {
  return (
    <div className="flex gap-4 h-full min-h-[400px] overflow-x-auto">
      {COLUMNS.map((col) => (
        <KotColumn
          key={col.title}
          title={col.title}
          status={col.statuses[0]}
          kots={kots.filter((k) => col.statuses.includes(k.status))}
          count={kots.filter((k) => col.statuses.includes(k.status)).length}
          onStatusAdvance={onStatusAdvance}
          onViewDetail={onViewDetail}
          onArchive={onArchive}
        />
      ))}
    </div>
  );
}
