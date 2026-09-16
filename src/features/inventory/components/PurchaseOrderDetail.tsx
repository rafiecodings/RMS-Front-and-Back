"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge, ConfirmDialog } from "@/components/shared";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, CheckCircle, Truck, XCircle } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useState } from "react";
import type { PurchaseOrder, PurchaseOrderStatus } from "@/lib/types";

interface PurchaseOrderDetailProps {
  order: PurchaseOrder;
  onStatusChange: (status: PurchaseOrderStatus) => void;
  isUpdating?: boolean;
}

const STATUS_FLOW: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  draft: ["pending", "cancelled"],
  pending: ["confirmed", "cancelled"],
  approved: ["confirmed", "cancelled"],
  ordered: ["confirmed", "cancelled"],
  partial: ["confirmed", "cancelled"],
  confirmed: ["received", "cancelled"],
  received: [],
  cancelled: [],
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Submit",
  confirmed: "Confirm",
  received: "Receive",
  cancelled: "Cancel",
};

export function PurchaseOrderDetail({ order, onStatusChange, isUpdating }: PurchaseOrderDetailProps) {
  const router = useRouter();
  const { user } = useAuth();
  const userRole = user?.role;
  const isCreator = !!user && !!order.created_by && order.created_by === user.id;
  const [pendingStatus, setPendingStatus] = useState<PurchaseOrderStatus | null>(null);

  // UI hint only — backend authorization is the source of truth.
  const nextStatuses = (STATUS_FLOW[order.status] ?? []).filter((s) => {
    if (s === "confirmed" && userRole === "inventory_staff") return false;
    if (s === "received" && isCreator) return false;
    return true;
  });

  const confirmConfig = pendingStatus
    ? {
        title: `${STATUS_LABELS[pendingStatus] ?? pendingStatus} Purchase Order`,
        description:
          pendingStatus === "cancelled"
            ? `Cancel ${order.po_number}? This cannot be undone and the order will be closed.`
            : pendingStatus === "received"
              ? `Mark ${order.po_number} as received? Stock levels will be updated.`
              : `Proceed to ${STATUS_LABELS[pendingStatus]} for ${order.po_number}?`,
        confirmText: STATUS_LABELS[pendingStatus] ?? pendingStatus,
        variant: (pendingStatus === "cancelled" ? "destructive" : "default") as "destructive" | "default",
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{order.po_number}</h2>
            <p className="text-sm text-muted-foreground">
              {order.supplier?.name ?? "Unknown supplier"} •{" "}
              {formatDate(order.expected_date ?? order.created_at)}
            </p>
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {nextStatuses.length > 0 && (
        <div className="flex flex-wrap gap-2">
              {nextStatuses.map((status) => {
            const icons: Record<string, React.ReactNode> = {
              pending: <CheckCircle className="h-4 w-4 mr-1" />,
              confirmed: <Truck className="h-4 w-4 mr-1" />,
              received: <CheckCircle className="h-4 w-4 mr-1" />,
              cancelled: <XCircle className="h-4 w-4 mr-1" />,
            };
            return (
              <Button
                key={status}
                variant={status === "cancelled" ? "destructive" : "default"}
                size="sm"
                onClick={() => setPendingStatus(status)}
                disabled={isUpdating}
              >
                {icons[status]}
                {STATUS_LABELS[status] ?? status}
              </Button>
            );
          })}
        </div>
      )}

      {confirmConfig && (
        <ConfirmDialog
          open={pendingStatus !== null}
          onOpenChange={(open) => {
            if (!open) setPendingStatus(null);
          }}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmText={confirmConfig.confirmText}
          variant={confirmConfig.variant}
          onConfirm={() => {
            if (pendingStatus) onStatusChange(pendingStatus);
            setPendingStatus(null);
          }}
          isLoading={isUpdating}
        />
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Expected Delivery</p>
          <p className="font-medium">
            {order.expected_date
              ? formatDate(order.expected_date)
              : "—"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Received Date</p>
          <p className="font-medium">
            {order.received_at
              ? formatDate(order.received_at)
              : "—"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Created By</p>
          <p className="font-medium">{order.creator?.name ?? "Unknown user"}</p>
        </div>
      </div>

      {order.notes && (
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground mb-1">Notes</p>
          <p className="text-sm">{order.notes}</p>
        </div>
      )}

      <div className="rounded-lg border overflow-x-auto">
        <div className="bg-muted/50 px-4 py-2 text-sm font-semibold">Line Items</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left px-4 py-2 font-medium">Ingredient</th>
              <th className="text-right px-4 py-2 font-medium">Quantity</th>
              <th className="text-right px-4 py-2 font-medium">Unit Cost</th>
              <th className="text-right px-4 py-2 font-medium">Total</th>
              <th className="text-right px-4 py-2 font-medium">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {order.items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/30">
                 <td className="px-4 py-2">{item.ingredient?.name ?? "Unknown Item"}</td>
                <td className="px-4 py-2 text-right tabular-nums">{item.quantity}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(item.unit_cost)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(item.total_cost)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{item.received_quantity ?? "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-bold">
              <td colSpan={3} className="px-4 py-2 text-right">Total</td>
              <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(order.total_amount)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
