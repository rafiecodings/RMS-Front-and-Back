"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { LoadingSpinner } from "@/components/shared";
import {
  KanbanBoard,
  KotDetailSheet,
  KitchenStats,
} from "@/features/kitchen";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useKitchenOrders } from "@/lib/hooks";
import { useKitchenWebSocket } from "@/lib/hooks/useWebSocket";
import type { Kot, KotStatus } from "@/lib/types";
import { toast } from "sonner";

export default function KitchenPage() {
  const [detailKot, setDetailKot] = useState<Kot | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [stationFilter, setStationFilter] = useState<string>("all");

  const { all, updateStatus } = useKitchenOrders();
  const { isConnected } = useKitchenWebSocket();

  const kots = useMemo(() => all.data ?? [], [all.data]);
  const isLoading = all.isLoading;

  const stations = useMemo(
    () => [...new Set(kots.map((k) => k.station).filter(Boolean))] as string[],
    [kots]
  );

  const filteredKots = useMemo(
    () => stationFilter === "all" ? kots : kots.filter((k) => k.station === stationFilter),
    [kots, stationFilter]
  );

  function handleStatusAdvance(kot: Kot) {
    const nextStatus: Record<KotStatus, KotStatus | null> = {
      received: "in_progress",
      in_progress: "ready",
      ready: null,
    };
    const next = nextStatus[kot.status];
    if (!next) return;

    updateStatus.mutate(
      { id: kot.id, status: next },
      {
        onSuccess: () =>
          toast.success(
            `${kot.kot_number} → ${next.replace(/_/g, " ")}`
          ),
        onError: () => toast.error("Failed to update KOT status"),
      }
    );
  }

  function handleViewDetail(kot: Kot) {
    setDetailKot(kot);
    setDetailOpen(true);
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              render={<Link href="/dashboard" />}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
                Kitchen Display
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 ${
                    isConnected
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {isConnected ? (
                    <span className="flex items-center gap-1">
                      <Wifi className="h-3 w-3" /> Live
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <WifiOff className="h-3 w-3" /> Polling
                    </span>
                  )}
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground">
                Auto-refreshes every 5 seconds
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {stations.length > 0 && (
              <Select
                value={stationFilter}
                onValueChange={(v) => setStationFilter(v ?? "all")}
              >
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="All Stations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stations</SelectItem>
                  {stations.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => all.refetch()}
              disabled={all.isFetching}
            >
              <RefreshCw
                className={`h-4 w-4 ${all.isFetching ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="shrink-0 px-4 pt-3">
        <KitchenStats kots={filteredKots} />
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden px-4 pt-3 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <KanbanBoard
            kots={filteredKots}
            onStatusAdvance={handleStatusAdvance}
            onViewDetail={handleViewDetail}
          />
        )}
      </div>

      {/* Detail Sheet */}
      <KotDetailSheet
        kot={detailKot}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
