"use client";

import { useParams } from "next/navigation";
import { EmptyState, LoadingSpinner } from "@/components/shared";
import { PurchaseOrderDetail } from "@/features/inventory";
import { usePurchaseOrder, usePurchaseOrders } from "@/lib/hooks";
import type { PurchaseOrderStatus } from "@/lib/types";
import { toast } from "sonner";

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: order, isLoading } = usePurchaseOrder(id);
  const { updateStatus } = usePurchaseOrders();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <EmptyState
        title="Purchase order not found"
        description="This purchase order may have been deleted."
      />
    );
  }

  function handleStatusChange(status: PurchaseOrderStatus) {
    updateStatus.mutate(
      { id, status },
      {
        onSuccess: () => toast.success(`PO status updated to ${status}`),
        onError: (e: Error) => toast.error(e.message || "Failed to update status"),
      }
    );
  }

  return (
    <div className="space-y-6">
      <PurchaseOrderDetail
        order={order}
        onStatusChange={handleStatusChange}
        isUpdating={updateStatus.isPending}
      />
    </div>
  );
}
