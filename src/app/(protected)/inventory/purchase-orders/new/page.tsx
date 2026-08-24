"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { PurchaseOrderForm } from "@/features/inventory";
import { usePurchaseOrders } from "@/lib/hooks";
import { toast } from "sonner";
import type { PurchaseOrderFormData } from "@/lib/types";

export default function NewPurchaseRequestPage() {
  const router = useRouter();
  const { create } = usePurchaseOrders();

  function handleSubmit(data: PurchaseOrderFormData) {
    create.mutate(data, {
      onSuccess: () => {
        toast.success("Purchase request created successfully");
        router.push("/inventory/purchase-orders");
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to create purchase request");
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Purchase Request"
        description="Request supplies from Supply Chain"
      />
      <PurchaseOrderForm onSubmit={handleSubmit} isLoading={create.isPending} />
    </div>
  );
}
