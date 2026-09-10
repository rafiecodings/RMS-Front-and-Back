"use client";

import { useState, useRef, useMemo } from "react";
import { PageHeader, ConfirmDialog, SearchInput, LoadingSpinner, TablePagination, ErrorState } from "@/components/shared";
import { OrderTable, OrderStats, OrderForm, OrderDetail } from "@/features/orders";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useOrders, useMenuItems, useCustomers, useTables, useOrder } from "@/lib/hooks";
import { DEBOUNCE_DELAY, ITEMS_PER_PAGE } from "@/lib/utils/constants";
import type { Order, OrderFormData, OrderItemFormData } from "@/lib/types";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";
import { canEdit, canArchiveOrders, canConfirmOrder, canServeOrder } from "@/lib/utils/permissions";

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Order | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user } = useAuth();
  const canCreate = canEdit(user?.role, "orders");
  const canArchive = canArchiveOrders(user?.role);

  const params = useMemo(
    () => ({
      page,
      per_page: ITEMS_PER_PAGE,
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(statusFilter !== "all" && { status: statusFilter }),
    }),
    [page, debouncedSearch, statusFilter]
  );

  const { list, create, update, cancel, archive, updateStatus } = useOrders(params);
  const { list: miList } = useMenuItems({ per_page: 200 });
  const { list: custList } = useCustomers({ per_page: 200 });
  const { list: tableList } = useTables();
  const { data: viewOrder, isLoading: viewLoading } = useOrder(viewId ?? "");
  const { data: editOrder, isLoading: editLoading } = useOrder(editId ?? "");

  const orders = list.data?.data?.data ?? [];
  const meta = list.data?.data?.meta;
  const menuItems = miList.data?.data?.data ?? [];
  const customers = custList.data?.data?.data ?? [];
  const tables = tableList.data ?? [];

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
      { id: cancelTarget.id, reason: "Cancelled by staff" },
      {
        onSuccess: () => {
          toast.success(`Order ${cancelTarget.order_number} cancelled`);
          setCancelTarget(null);
        },
        onError: () => toast.error("Failed to cancel order"),
      }
    );
  }

  function handleOrderSubmit(data: OrderFormData) {
    create.mutate(data, {
      onSuccess: () => {
        toast.success("Order placed successfully");
        setShowNewDialog(false);
      },
      onError: () => toast.error("Failed to place order"),
    });
  }

  function handleEditSubmit(data: OrderFormData) {
    if (!editId) return;
    update.mutate(
      { id: editId, data },
      {
        onSuccess: () => {
          toast.success("Order updated successfully");
          setEditId(null);
        },
        onError: () => toast.error("Failed to update order"),
      }
    );
  }

  function handleArchiveConfirm() {
    if (!archiveTarget) return;
    archive.mutate(archiveTarget.id, {
      onSuccess: () => {
        toast.success(`Order ${archiveTarget.order_number} archived`);
        setArchiveTarget(null);
      },
      onError: (error) => {
        const message =
          (error as { response?: { data?: { message?: string } }; message?: string })
            ?.response?.data?.message ||
          (error as { message?: string })?.message ||
          "Failed to archive order";
        toast.error(message);
      },
    });
  }

  const canConfirm = canConfirmOrder(user?.role);
  const canServe = canServeOrder(user?.role);

  function handleServeOrder(order: Order) {
    updateStatus.mutate(
      { id: order.id, status: "served" },
      {
        onSuccess: () =>
          toast.success(`Order ${order.order_number} marked as served`),
        onError: (error) => {
          const message =
            (error as { response?: { data?: { message?: string } }; message?: string })
              ?.response?.data?.message ||
            (error as { message?: string })?.message ||
            "Failed to mark order as served";
          toast.error(message);
        },
      }
    );
  }

  function handleSendToKitchen(order: Order) {
    updateStatus.mutate(
      { id: order.id, status: "confirmed" },
      {
        onSuccess: () =>
          toast.success(`Order ${order.order_number} sent to kitchen`),
        onError: (error) => {
          const message =
            (error as { response?: { data?: { message?: string } }; message?: string })
              ?.response?.data?.message ||
            (error as { message?: string })?.message ||
            "Failed to send order to kitchen";
          toast.error(message);
        },
      }
    );
  }

  const editInitialData = editOrder
    ? ({
        order_type: editOrder.order_type,
        customer_id: editOrder.customer_id,
        table_id: editOrder.table_id,
        items: editOrder.items.map((item: OrderItemFormData) => ({
          menu_item_id: item.menu_item_id,
          variant: item.variant,
          quantity: item.quantity,
          unit_price: item.unit_price,
          notes: item.notes,
        })),
        notes: editOrder.notes,
      } as OrderFormData & { items: OrderItemFormData[] })
    : undefined;

  const canEditOrder =
    editOrder &&
    (editOrder.status === "pending" ||
      editOrder.status === "confirmed");

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Manage restaurant orders"
        action={
          canCreate && (
            <Button size="sm" onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              New Order
            </Button>
          )
        }
      />

      <div className="space-y-6">
        <OrderStats orders={orders} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by order # or customer..."
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
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="served">Served</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <OrderTable
          orders={orders}
          isLoading={list.isLoading}
          onCancel={(o) => {
            setCancelTarget(o);
          }}
          onView={(o) => setViewId(o.id)}
          onEdit={(o) => setEditId(o.id)}
          onArchive={canArchive ? setArchiveTarget : undefined}
          onSendToKitchen={canConfirm && !updateStatus.isPending ? handleSendToKitchen : undefined}
          onServeOrder={canServe && !updateStatus.isPending ? handleServeOrder : undefined}
        />

        {list.isError && (
          <ErrorState
            message="Failed to load orders. Please try again."
            onRetry={() => list.refetch()}
            className="mb-4"
          />
        )}

        {meta && meta.last_page > 1 && (
          <TablePagination
            currentPage={meta.current_page}
            totalPages={meta.last_page}
            onPageChange={setPage}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null);
          }
        }}
        title="Cancel Order"
        description={`Are you sure you want to cancel order ${cancelTarget?.order_number}? This action cannot be undone.`}
        confirmText="Cancel Order"
        variant="destructive"
        onConfirm={handleCancelConfirm}
        isLoading={cancel.isPending}
      />

      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveTarget(null);
          }
        }}
        title="Archive Order"
        description={`Are you sure you want to archive order ${archiveTarget?.order_number}? Archived orders are hidden from the active list but kept for records. Only completed or cancelled orders can be archived.`}
        confirmText="Archive Order"
        onConfirm={handleArchiveConfirm}
        isLoading={archive.isPending}
      />

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 z-10 rounded-t-xl bg-card pr-12 pb-4">
            <DialogTitle>New Order</DialogTitle>
          </DialogHeader>
          <OrderForm
            menuItems={menuItems}
            customers={customers}
            tables={tables}
            onSubmit={handleOrderSubmit}
            isLoading={create.isPending || miList.isLoading}
            submitLabel="Place Order"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewId} onOpenChange={(open) => !open && setViewId(null)}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 z-10 rounded-t-xl bg-card pr-12 pb-4">
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {viewLoading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : viewOrder ? (
            <OrderDetail order={viewOrder} />
          ) : (
            <p className="text-sm text-muted-foreground">Order not found.</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 z-10 rounded-t-xl bg-card pr-12 pb-4">
            <DialogTitle>Edit Order</DialogTitle>
          </DialogHeader>
          {editLoading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : editOrder && canEditOrder && editInitialData ? (
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <OrderForm
                key={editId}
                initialData={editInitialData}
                menuItems={menuItems}
                customers={customers}
                tables={tables}
                onSubmit={handleEditSubmit}
                isLoading={update.isPending}
                submitLabel="Update Order"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This order can no longer be edited.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
