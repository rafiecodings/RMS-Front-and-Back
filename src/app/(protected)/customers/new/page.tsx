"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { CustomerForm } from "@/features/customers";
import { useCustomers } from "@/lib/hooks";
import { toast } from "sonner";
import type { CustomerFormData } from "@/lib/types";

export default function NewCustomerPage() {
  const router = useRouter();
  const { create } = useCustomers();

  function handleSubmit(data: CustomerFormData) {
    create.mutate(data, {
      onSuccess: () => {
        toast.success("Customer created successfully");
        router.push("/customers");
      },
      onError: () => {
        toast.error("Failed to create customer");
      },
    });
  }

  return (
    <div>
      <PageHeader
        title="Add Customer"
        description="Create a new customer profile"
      />
      <div className="rounded-lg border bg-card p-6 shadow-sm max-w-2xl">
        <CustomerForm
          onSubmit={handleSubmit}
          isLoading={create.isPending}
          submitLabel="Create Customer"
        />
      </div>
    </div>
  );
}
