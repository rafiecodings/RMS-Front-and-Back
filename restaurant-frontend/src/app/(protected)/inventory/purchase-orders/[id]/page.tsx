"use client";

import { use } from "react";
import { DetailPageSkeleton, EmptyState } from "@/components/shared";
import { PurchaseOrderDetail } from "@/features/inventory";
import { usePurchaseOrder, usePurchaseOrders } from "@/lib/hooks";
import type { PurchaseOrderStatus } from "@/lib/types";
import { toast } from "sonner";
import { PackageSearch } from "lucide-react";

export default function PurchaseRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: order, isLoading } = usePurchaseOrder(id);
  const { updateStatus } = usePurchaseOrders();

  if (isLoading) {
    return (
      <DetailPageSkeleton />
    );
  }

  if (!order) {
    return (
      <EmptyState
        title="Purchase request not found"
        icon={<PackageSearch className="h-8 w-8" />}
        description="This purchase request may have been deleted."
      />
    );
  }

  function handleStatusChange(status: PurchaseOrderStatus) {
    updateStatus.mutate(
      { id, status },
      {
        onSuccess: () => toast.success(`Request status updated to ${status}`),
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
