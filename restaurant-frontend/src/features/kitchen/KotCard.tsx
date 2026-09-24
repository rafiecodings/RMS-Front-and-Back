"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared";
import { PriorityBadge } from "./PriorityBadge";
import { OrderTimer } from "./OrderTimer";
import { UtensilsCrossed, ShoppingBag, Truck, Play, CircleCheck, Eye, Archive } from "lucide-react";
import type { Kot, KotStatus, KotPriority } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dine_in: UtensilsCrossed,
  takeaway: ShoppingBag,
  delivery: Truck,
};

const STATUS_BORDER: Record<KotStatus, string> = {
  received: "border-l-blue-500",
  pending: "border-l-blue-500",
  in_progress: "border-l-amber-500",
  ready: "border-l-emerald-500",
  completed: "border-l-gray-400",
  voided: "border-l-red-400 opacity-60",
};

const PRIORITY_BORDER: Record<KotPriority, string> = {
  urgent: "border-t-red-500 border-t-2",
  high: "border-t-orange-400 border-t-2",
  normal: "",
  low: "opacity-80",
};

interface KotCardProps {
  kot: Kot;
  onStatusAdvance: (kot: Kot) => void;
  onViewDetail: (kot: Kot) => void;
  onArchive: (kot: Kot) => void;
}

export function KotCard({ kot, onStatusAdvance, onViewDetail, onArchive }: KotCardProps) {
  const TypeIcon = (kot.order?.order_type ? TYPE_ICONS[kot.order.order_type] : null) ?? UtensilsCrossed;
  const tableNumber = kot.order?.table?.number;
const nextStatus: Record<KotStatus, KotStatus | null> = {
    received: "in_progress",
    pending: "in_progress",
    in_progress: "ready",
    ready: null,
    completed: null,
    voided: null,
  };

  const nextLabel: Record<KotStatus, string> = {
    received: "Start Preparing",
    pending: "Start Preparing",
    in_progress: "Mark Ready",
    ready: "Complete",
    completed: "Archive",
    voided: "Voided",
  };
  const canAdvance = nextStatus[kot.status] !== null;
  const canArchive = kot.status === "ready" || kot.status === "completed";
  const isTerminal =
    kot.status === "ready" ||
    kot.status === "completed" ||
    kot.status === "voided";
  const stopAt = isTerminal ? (kot.completed_at ?? kot.updated_at) : undefined;

  return (
    <Card
      className={cn(
        "border-l-4 transition-shadow hover:shadow-md",
        STATUS_BORDER[kot.status],
        PRIORITY_BORDER[kot.priority]
      )}
    >
      <CardContent className="p-3 space-y-2.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{kot.kot_number}</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0">
                #{kot.order?.order_number ?? "—"}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
              <TypeIcon className="h-3 w-3" />
              <span className="capitalize">
                {kot.order?.order_type?.replace(/_/g, " ") ?? "—"}
              </span>
              {tableNumber && (
                <>
                  <span>·</span>
                  <span className="font-medium">{tableNumber}</span>
                </>
              )}
              {kot.station && (
                <>
                  <span>·</span>
                  <span>{kot.station}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge status={kot.status} className="text-[9px] px-1 py-0 h-4" />
            <PriorityBadge priority={kot.priority} />
            <OrderTimer createdAt={kot.created_at} status={kot.status} stopAt={stopAt} />
          </div>
        </div>

         {/* Items */}
        <div className="space-y-1">
          {(kot.items ?? []).map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between text-xs"
            >
              <div className="min-w-0 flex-1">
                <span className="font-medium">
                  {item.quantity}× {item.name ?? item.menu_item_name}
                </span>
                {item.variant && (
                  <span className="text-muted-foreground ml-1">
                    ({item.variant})
                  </span>
                )}
                {item.modifiers && item.modifiers.length > 0 && (
                  <span className="text-muted-foreground ml-1">
                    + {item.modifiers.map((m) => m.name).join(", ")}
                  </span>
                )}
              </div>
              {item.status === "ready" && (
                <CircleCheck className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
              )}
            </div>
          ))}
        </div>

        {/* Notes */}
        {kot.notes && (
          <p className="text-xs text-muted-foreground italic truncate">
            {kot.notes}
          </p>
        )}

        {kot.order?.notes && (
          <p className="text-xs text-muted-foreground italic truncate">
            Order: {kot.order.notes}
          </p>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs shrink-0"
            onClick={() => onViewDetail(kot)}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Details
          </Button>

          {canAdvance && (
            <Button
              size="sm"
              className={cn(
                "h-9 flex-1 text-xs font-semibold",
                kot.status === "received"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              )}
              onClick={() => onStatusAdvance(kot)}
            >
              {kot.status === "received" ? (
                <Play className="h-3.5 w-3.5 mr-1" />
              ) : (
                <CircleCheck className="h-3.5 w-3.5 mr-1" />
              )}
              {nextLabel[kot.status]}
            </Button>
          )}

          {canArchive && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 flex-1 text-xs"
              onClick={() => onArchive(kot)}
            >
              <Archive className="h-3.5 w-3.5 mr-1" />
              Archive
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
