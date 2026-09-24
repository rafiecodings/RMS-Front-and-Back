"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared";
import { PriorityBadge } from "./PriorityBadge";
import { OrderTimer } from "./OrderTimer";
import type { Kot } from "@/lib/types";
import { Archive } from "lucide-react";

interface KotDetailSheetProps {
  kot: Kot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onArchive?: (kot: Kot) => void;
}

export function KotDetailSheet({
  kot,
  open,
  onOpenChange,
  onArchive,
}: KotDetailSheetProps) {
  if (!kot) return null;

  const tableNumber = kot.order?.table?.number;
  const customerName = kot.order?.customer?.name;
  const isTerminal = kot.status === "ready" || kot.status === "completed";
  const stopAt = isTerminal ? (kot.completed_at ?? kot.updated_at) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {kot.kot_number}
              <StatusBadge status={kot.status} className="text-[10px] px-1.5 py-0" />
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
                <p className="font-medium">{tableNumber}</p>
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
              <OrderTimer createdAt={kot.created_at} status={kot.status} stopAt={stopAt} />
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
              {(kot.items ?? []).map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {item.quantity}× {item.name ?? item.menu_item_name}
                      </span>
                      {item.variant && (
                        <span className="text-xs text-muted-foreground">
                          ({item.variant})
                        </span>
                      )}
                    </div>
                    <StatusBadge status={item.status} className="text-[9px] px-1 py-0 h-4" />
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

          {/* Archive action */}
          {isTerminal && onArchive && (
            <>
              <Separator />
              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={() => onArchive(kot)}
              >
                <Archive className="h-3.5 w-3.5 mr-1" />
                Archive KOT
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
