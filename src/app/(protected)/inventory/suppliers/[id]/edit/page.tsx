"use client";

import { useParams, useRouter } from "next/navigation";
import { PageHeader, EmptyState, LoadingSpinner } from "@/components/shared";
import { SupplierForm } from "@/features/inventory";
import { useSuppliers } from "@/lib/hooks";
import { toast } from "sonner";
import type { SupplierFormData } from "@/lib/types";

export default function EditSupplierPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { list, update } = useSuppliers({ per_page: 200 });
  const suppliers = list.data?.data?.data ?? [];
  const supplier = suppliers.find((s) => s.id === id);

  if (list.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <EmptyState
        title="Supplier not found"
        description="This supplier may have been deleted."
      />
    );
  }

  function handleSubmit(data: SupplierFormData) {
    update.mutate(
      { id, data },
      {
        onSuccess: () => {
          toast.success("Supplier updated successfully");
          router.push(`/inventory/suppliers/${id}`);
        },
        onError: (error: Error) => {
          toast.error(error.message || "Failed to update supplier");
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${supplier.name}`}
        description="Update supplier details"
      />
      <SupplierForm
        initialData={supplier}
        onSubmit={handleSubmit}
        isLoading={update.isPending}
      />
    </div>
  );
}
