"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared";
import {
  PurchaseOrderTable,
  PurchaseOrderStats,
  PurchaseOrderForm,
  PurchaseOrderDetail,
} from "@/features/inventory";
import { usePurchaseOrders, usePurchaseOrder } from "@/lib/hooks";
import { Plus } from "lucide-react";
import type { PurchaseOrderStatus, PurchaseOrderFormData } from "@/lib/types";
import { toast } from "sonner";

export default function PurchaseRequestsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

  const { list, create, updateStatus } = usePurchaseOrders({
    page,
    per_page: 20,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const { data: viewOrder, isLoading: viewLoading } = usePurchaseOrder(viewId ?? "");

  const orders = list.data?.data?.data ?? [];
  const totalPages = list.data?.data?.meta?.last_page ?? 1;

  function handleCreate(data: PurchaseOrderFormData) {
    create.mutate(data, {
      onSuccess: () => {
        toast.success("Purchase request created");
        setAddOpen(false);
      },
      onError: () => toast.error("Failed to create purchase request"),
    });
  }

  function handleStatusChange(status: PurchaseOrderStatus) {
    if (!viewId) return;
    updateStatus.mutate(
      { id: viewId, status },
      {
        onSuccess: () => {
          toast.success(`Request status updated to ${status}`);
          setViewId(null);
        },
        onError: (e: Error) => toast.error(e.message || "Failed to update status"),
      }
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Requests"
        description="Request supplies from Supply Chain"
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Request
          </Button>
        }
      />

      <PurchaseOrderStats
        stats={{
          totalOrders: list.data?.data?.meta?.total ?? 0,
          pendingOrders: orders.filter((o) => ["draft", "pending", "approved"].includes(o.status)).length,
          receivedThisMonth: orders.filter((o) => o.status === "received").length,
          totalSpent: orders.filter((o) => o.status === "received").reduce((sum, o) => sum + o.total_amount, 0),
        }}
        isLoading={list.isLoading}
      />

      <PurchaseOrderTable
        orders={orders}
        isLoading={list.isLoading}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(v) => {
          setStatusFilter(v);
          setPage(1);
        }}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onView={(order) => setViewId(order.id)}
      />

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          if (!open) setAddOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Purchase Request</DialogTitle>
          </DialogHeader>
          <PurchaseOrderForm
            onSubmit={handleCreate}
            isLoading={create.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewId}
        onOpenChange={(open) => {
          if (!open) setViewId(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Request Details</DialogTitle>
          </DialogHeader>
          {viewLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : viewOrder ? (
            <PurchaseOrderDetail
              order={viewOrder}
              onStatusChange={handleStatusChange}
              isUpdating={updateStatus.isPending}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Purchase request not found.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
