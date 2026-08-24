"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Clock, Pause } from "lucide-react";
import type { KotStatus } from "@/lib/types";

interface OrderTimerProps {
  createdAt: string;
  status?: KotStatus;
  stopAt?: string | null;
  className?: string;
  showIcon?: boolean;
}

const TERMINAL_STATUSES: KotStatus[] = ["ready", "completed"];

function computeElapsed(createdAt: string | null | undefined): number {
  if (!createdAt) return 0;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Date.now() - created);
}

function computeStoppedElapsed(
  createdAt: string | null | undefined,
  stopAt: string | null | undefined
): number {
  if (!createdAt || !stopAt) return computeElapsed(createdAt);
  const created = new Date(createdAt).getTime();
  const stopped = new Date(stopAt).getTime();
  if (Number.isNaN(created) || Number.isNaN(stopped)) return 0;
  return Math.max(0, stopped - created);
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getTimerColor(ms: number): string {
  const minutes = ms / 60000;
  if (minutes > 20) return "text-red-600 dark:text-red-400";
  if (minutes > 10) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function getTimerBg(ms: number): string {
  const minutes = ms / 60000;
  if (minutes > 20)
    return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
  if (minutes > 10)
    return "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800";
  return "bg-muted/50";
}

export function OrderTimer({ createdAt, status, stopAt, className, showIcon = true }: OrderTimerProps) {
  const isTerminal = status !== undefined && TERMINAL_STATUSES.includes(status);
  const isStopped = isTerminal || Boolean(stopAt);
  const [elapsed, setElapsed] = useState(() => {
    if (isStopped) return computeStoppedElapsed(createdAt, stopAt);
    return computeElapsed(createdAt);
  });

  useEffect(() => {
    if (isStopped) {
      // Already stopped: the lazy initializer above captured the frozen
      // elapsed (using the explicit stop timestamp when present). No live
      // ticking is needed, so just leave the frozen value in place.
      return;
    }
    // Not stopped: run the live interval.
    function update() {
      setElapsed(computeElapsed(createdAt));
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [createdAt, stopAt, isStopped, status]);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-mono font-medium",
        isStopped ? "bg-muted/30 text-muted-foreground" : getTimerColor(elapsed),
        isStopped ? "" : getTimerBg(elapsed),
        className
      )}
    >
      {showIcon && (
        isStopped ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Clock className="h-3 w-3" />
        )
      )}
      {formatElapsed(elapsed)}
    </div>
  );
}

export { formatElapsed, getTimerColor };
