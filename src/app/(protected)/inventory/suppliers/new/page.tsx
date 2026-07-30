"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { SupplierForm } from "@/features/inventory";
import { useSuppliers } from "@/lib/hooks";
import { toast } from "sonner";
import type { SupplierFormData } from "@/lib/types";

export default function NewSupplierPage() {
  const router = useRouter();
  const { create } = useSuppliers();

  function handleSubmit(data: SupplierFormData) {
    create.mutate(data, {
      onSuccess: () => {
        toast.success("Supplier created successfully");
        router.push("/inventory/suppliers");
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to create supplier");
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Supplier"
        description="Add a new supplier to your directory"
      />
      <SupplierForm onSubmit={handleSubmit} isLoading={create.isPending} />
    </div>
  );
}
