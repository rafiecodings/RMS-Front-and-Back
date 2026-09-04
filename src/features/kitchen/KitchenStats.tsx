"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Inbox,
  Flame,
  CheckCircle,
  Timer,
} from "lucide-react";
import type { Kot } from "@/lib/types";

interface KitchenStatsProps {
  kots: Kot[];
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}) {
  return (
    <Card>
      <CardContent className="pt-1 pb-1">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold tracking-tight">{value}</p>
          </div>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconColor}`}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function toTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function formatAvgWait(kots: Kot[], nowMs: number): string {
  const withStarted = kots.filter((k) => k.started_at || k.created_at);
  if (withStarted.length === 0) return "—";

  const totalMs = withStarted.reduce((sum, k) => {
    const start = toTimestamp(k.started_at ?? k.created_at);
    const end = k.completed_at ? toTimestamp(k.completed_at) : nowMs;
    return sum + (end - start);
  }, 0);

  const avgMinutes = Math.round(totalMs / withStarted.length / 60000);
  if (avgMinutes < 1) return "<1m";
  return `${avgMinutes}m`;
}

export function KitchenStats({ kots }: KitchenStatsProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const received = kots.filter((k) => k.status === "received").length;
  const inProgress = kots.filter((k) => k.status === "in_progress").length;
  const ready = kots.filter((k) => k.status === "ready").length;
  const avgWait = formatAvgWait(kots, nowMs);

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
      <StatCard
        title="Received"
        value={received}
        icon={Inbox}
        iconColor="bg-blue-500/10 text-blue-600"
      />
      <StatCard
        title="In Progress"
        value={inProgress}
        icon={Flame}
        iconColor="bg-amber-500/10 text-amber-600"
      />
      <StatCard
        title="Ready"
        value={ready}
        icon={CheckCircle}
        iconColor="bg-emerald-500/10 text-emerald-600"
      />
      <StatCard
        title="Avg Wait"
        value={avgWait}
        icon={Timer}
        iconColor="bg-violet-500/10 text-violet-600"
      />
    </div>
  );
}
