"use client";

import { useState, useRef, useMemo } from "react";
import Link from "next/link";
import { PageHeader, ConfirmDialog, SearchInput } from "@/components/shared";
import {
  OrderTable,
  OrderStats,
} from "@/features/orders";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useOrders } from "@/lib/hooks";
import { DEBOUNCE_DELAY, ITEMS_PER_PAGE } from "@/lib/utils/constants";
import type { Order } from "@/lib/types";
import { toast } from "sonner";

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const params = useMemo(() => ({
    page,
    per_page: ITEMS_PER_PAGE,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(statusFilter !== "all" && { status: statusFilter }),
    ...(typeFilter !== "all" && { order_type: typeFilter }),
  }), [page, debouncedSearch, statusFilter, typeFilter]);

  const { list, cancel } = useOrders(params);

  const orders = list.data?.data?.data ?? [];
  const meta = list.data?.data?.meta;

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, DEBOUNCE_DELAY);
  }

  function handleCancelConfirm() {
    if (!cancelTarget) return;
    cancel.mutate(
      { id: cancelTarget.id, reason: cancelReason || "Cancelled by staff" },
      {
        onSuccess: () => {
          toast.success(`Order ${cancelTarget.order_number} cancelled`);
          setCancelTarget(null);
          setCancelReason("");
        },
        onError: () => toast.error("Failed to cancel order"),
      }
    );
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Manage restaurant orders"
        action={
          <Button size="sm" render={<Link href="/orders/new" />}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Order
          </Button>
        }
      />

      <div className="space-y-6">
        <OrderStats orders={orders} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by order #, customer..."
          />

          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="served">Served</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={typeFilter}
              onValueChange={(val) => {
                setTypeFilter(val ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="dine_in">Dine In</SelectItem>
                <SelectItem value="takeaway">Takeaway</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <OrderTable
          orders={orders}
          isLoading={list.isLoading}
          onCancel={(o) => {
            setCancelTarget(o);
            setCancelReason("");
          }}
        />

        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(meta.current_page - 1) * meta.per_page + 1}–
              {Math.min(meta.current_page * meta.per_page, meta.total)} of{" "}
              {meta.total}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(meta.last_page, 5) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              {meta.last_page > 5 && (
                <span className="flex items-center px-1 text-muted-foreground">
                  …
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null);
            setCancelReason("");
          }
        }}
        title="Cancel Order"
        description={`Are you sure you want to cancel order ${cancelTarget?.order_number}? This action cannot be undone.`}
        confirmText="Cancel Order"
        variant="destructive"
        onConfirm={handleCancelConfirm}
        isLoading={cancel.isPending}
      />
    </div>
  );
}
