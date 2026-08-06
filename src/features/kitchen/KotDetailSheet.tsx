"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PriorityBadge } from "./PriorityBadge";
import { OrderTimer } from "./OrderTimer";
import type { Kot } from "@/lib/types";
import { cn } from "@/lib/utils";

interface KotDetailSheetProps {
  kot: Kot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_STYLES: Record<string, string> = {
  received: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  in_progress:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  ready: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const ITEM_STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  in_progress: "bg-amber-100 text-amber-700",
  ready: "bg-emerald-100 text-emerald-700",
};

function formatTime(dateStr?: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function KotDetailSheet({
  kot,
  open,
  onOpenChange,
}: KotDetailSheetProps) {
  if (!kot) return null;

  const tableNumber = kot.order?.table?.number;
  const customerName = kot.order?.customer?.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {kot.kot_number}
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  STATUS_STYLES[kot.status]
                )}
              >
                {kot.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </Badge>
            </DialogTitle>
            <PriorityBadge priority={kot.priority} />
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Order</p>
              <p className="font-medium">{kot.order?.order_number ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="font-medium capitalize">
                {kot.order?.order_type?.replace(/_/g, " ") ?? "—"}
              </p>
            </div>
            {tableNumber && (
              <div>
                <p className="text-xs text-muted-foreground">Table</p>
                <p className="font-medium">T{tableNumber}</p>
              </div>
            )}
            {customerName && (
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium">{customerName}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Station</p>
              <p className="font-medium">{kot.station ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Time</p>
              <OrderTimer createdAt={kot.created_at} />
            </div>
            {kot.estimated_time && (
              <div>
                <p className="text-xs text-muted-foreground">Est. Time</p>
                <p className="font-medium">{kot.estimated_time} min</p>
              </div>
            )}
            {kot.assigned_to && (
              <div>
                <p className="text-xs text-muted-foreground">Assigned To</p>
                <p className="font-medium">{kot.assigned_to.name}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Items */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Items</h4>
            <div className="space-y-2">
              {kot.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {item.quantity}× {item.menu_item_name}
                      </span>
                      {item.variant && (
                        <span className="text-xs text-muted-foreground">
                          ({item.variant})
                        </span>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[9px] px-1 py-0",
                        ITEM_STATUS_STYLES[item.status]
                      )}
                    >
                      {item.status}
                    </Badge>
                  </div>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Modifiers:{" "}
                      {item.modifiers.map((m) => m.name).join(", ")}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-xs text-muted-foreground italic">
                      {item.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {(kot.notes || kot.order?.notes) && (
            <>
              <Separator />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">Notes</h4>
                {kot.notes && (
                  <p className="text-sm text-muted-foreground">
                    KOT: {kot.notes}
                  </p>
                )}
                {kot.order?.notes && (
                  <p className="text-sm text-muted-foreground">
                    Order: {kot.order.notes}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Timeline */}
          <Separator />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold mb-2">Timeline</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Received</p>
                <p className="font-medium">{formatTime(kot.created_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Started</p>
                <p className="font-medium">{formatTime(kot.started_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Completed</p>
                <p className="font-medium">{formatTime(kot.completed_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
