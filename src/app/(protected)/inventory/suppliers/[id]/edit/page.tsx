"use client";

import { useParams, useRouter } from "next/navigation";
import { FormPageSkeleton, PageHeader, EmptyState } from "@/components/shared";
import { SupplierForm } from "@/features/inventory";
import { useSuppliers } from "@/lib/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { canEdit } from "@/lib/utils/permissions";
import { toast } from "sonner";
import type { SupplierFormData } from "@/lib/types";
import { Truck } from "lucide-react";

export default function EditSupplierPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuth();

  const { list, update } = useSuppliers({ per_page: 200 });
  const suppliers = list.data?.data?.data ?? [];
  const supplier = suppliers.find((s) => s.id === id);

  if (list.isLoading) {
    return (
      <FormPageSkeleton />
    );
  }

  if (!supplier) {
    return (
      <EmptyState
        title="Supplier not found"
        icon={<Truck className="h-8 w-8" />}
        description="This supplier may have been deleted."
      />
    );
  }

  if (!canEdit(user?.role, "inventory")) {
    return (
      <PageHeader title="Not authorized" description="You cannot edit suppliers." />
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
        existingNames={suppliers
          .filter((s) => s.id !== id)
          .map((s) => s.name)}
      />
    </div>
  );
}
