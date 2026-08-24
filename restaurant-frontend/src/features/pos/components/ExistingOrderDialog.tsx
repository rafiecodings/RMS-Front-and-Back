"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared";
import { Search, Receipt } from "lucide-react";
import { useUnpaidOrders } from "@/lib/hooks";
import { formatCurrency, formatLabel } from "@/lib/utils";
import type { Order } from "@/lib/types";

const EXCLUDED_STATUSES = ["cancelled", "completed"];

const PAYMENT_BADGE: Record<string, string> = {
  unpaid: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  partial:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
};

interface ExistingOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (order: Order) => void;
}

export function ExistingOrderDialog({
  open,
  onOpenChange,
  onSelect,
}: ExistingOrderDialogProps) {
  const { data, isLoading } = useUnpaidOrders();
  const [query, setQuery] = useState("");

  const orders = useMemo(() => {
    const all = (data?.data?.data ?? []) as Order[];
    return all
      .filter((o) => !EXCLUDED_STATUSES.includes(o.status))
      .filter((o) =>
        query === ""
          ? true
          : o.order_number.toLowerCase().includes(query.toLowerCase()) ||
            (o.customer?.name ?? "")
              .toLowerCase()
              .includes(query.toLowerCase())
      );
  }, [data, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select an Order to Pay</DialogTitle>
          <DialogDescription>
            Unpaid or partially paid orders appear here. Selecting one loads it
            for payment without recreating it.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by order # or customer..."
            className="pl-8"
          />
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <LoadingSpinner size="lg" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <Receipt className="h-8 w-8 opacity-40" />
              <p className="text-sm">No unpaid orders found</p>
            </div>
          ) : (
            orders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => onSelect(order)}
                className="flex w-full items-center justify-between rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {order.order_number}
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-[9px] px-1.5 py-0 ${
                        PAYMENT_BADGE[order.payment_status ?? "unpaid"] ?? ""
                      }`}
                    >
                      {formatLabel(order.payment_status ?? "unpaid")}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                    {order.order_type.replace(/_/g, " ")}
                    {order.table
                      ? ` · Table ${order.table.number}`
                      : ""}
                    {order.customer ? ` · ${order.customer.name}` : ""}
                  </p>
                </div>
                <div className="ml-3 shrink-0 text-right">
                  <p className="text-sm font-bold">
                    {formatCurrency(order.total_amount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {formatLabel(order.status)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
