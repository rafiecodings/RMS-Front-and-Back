"use client";

import { cn } from "@/lib/utils";
import type { KotPriority } from "@/lib/types";

interface PriorityBadgeProps {
  priority: KotPriority;
  className?: string;
}

const PRIORITY_STYLES: Record<KotPriority, string> = {
  urgent:
    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 animate-pulse",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  normal: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  low: "bg-gray-100 text-gray-500 dark:bg-gray-900/40 dark:text-gray-400",
};

const PRIORITY_DOT: Record<KotPriority, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  normal: "bg-blue-500",
  low: "bg-gray-400",
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        PRIORITY_STYLES[priority],
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          PRIORITY_DOT[priority],
          priority === "urgent" && "animate-ping"
        )}
      />
      {priority}
    </span>
  );
}

export { PRIORITY_STYLES, PRIORITY_DOT };
