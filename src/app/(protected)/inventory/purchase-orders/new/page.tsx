"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { PurchaseOrderForm } from "@/features/inventory";
import { usePurchaseOrders } from "@/lib/hooks";
import { toast } from "sonner";
import type { PurchaseOrderFormData } from "@/lib/types";

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { create } = usePurchaseOrders();

  function handleSubmit(data: PurchaseOrderFormData) {
    create.mutate(data, {
      onSuccess: () => {
        toast.success("Purchase order created successfully");
        router.push("/inventory/purchase-orders");
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to create purchase order");
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Purchase Order"
        description="Create a purchase order for a supplier"
      />
      <PurchaseOrderForm onSubmit={handleSubmit} isLoading={create.isPending} />
    </div>
  );
}
