"use client";

import { KotColumn } from "./KotColumn";
import type { Kot, KotStatus } from "@/lib/types";

interface KanbanBoardProps {
  kots: Kot[];
  onStatusAdvance: (kot: Kot) => void;
  onViewDetail: (kot: Kot) => void;
}

const COLUMNS: { title: string; status: KotStatus }[] = [
  { title: "Received", status: "received" },
  { title: "In Progress", status: "in_progress" },
  { title: "Ready", status: "ready" },
];

export function KanbanBoard({
  kots,
  onStatusAdvance,
  onViewDetail,
}: KanbanBoardProps) {
  return (
    <div className="flex gap-4 h-full min-h-[400px] overflow-x-auto">
      {COLUMNS.map((col) => (
        <KotColumn
          key={col.status}
          title={col.title}
          status={col.status}
          kots={kots.filter((k) => k.status === col.status)}
          count={kots.filter((k) => k.status === col.status).length}
          onStatusAdvance={onStatusAdvance}
          onViewDetail={onViewDetail}
        />
      ))}
    </div>
  );
}
