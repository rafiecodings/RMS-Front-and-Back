"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface OrderTimerProps {
  createdAt: string;
  className?: string;
}

function getElapsedMs(createdAt: string | null | undefined): number {
  if (!createdAt) return 0;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Date.now() - created);
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

export function OrderTimer({ createdAt, className }: OrderTimerProps) {
  const [elapsed, setElapsed] = useState(() => getElapsedMs(createdAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(getElapsedMs(createdAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-mono font-medium",
        getTimerColor(elapsed),
        getTimerBg(elapsed),
        className
      )}
    >
      <Clock className="h-3 w-3" />
      {formatElapsed(elapsed)}
    </div>
  );
}

export { formatElapsed, getTimerColor };
