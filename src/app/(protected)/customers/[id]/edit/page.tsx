"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader, LoadingSpinner } from "@/components/shared";
import { CustomerForm } from "@/features/customers";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useCustomers } from "@/lib/hooks";
import { toast } from "sonner";
import type { CustomerFormData } from "@/lib/types";

export default function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { list, update } = useCustomers();

  const customers = list.data?.data?.data ?? [];
  const customer = customers.find((c) => c.id === id);

  function handleSubmit(data: CustomerFormData) {
    update.mutate(
      { id, data },
      {
        onSuccess: () => {
          toast.success("Customer updated successfully");
          router.push(`/customers/${id}`);
        },
        onError: () => {
          toast.error("Failed to update customer");
        },
      }
    );
  }

  if (list.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div>
        <PageHeader
          title="Customer Not Found"
          description="The customer you're trying to edit doesn't exist."
          action={
            <Button variant="outline" size="sm" render={<Link href="/customers" />}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Customers
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Edit Customer"
        description={`Editing profile for ${customer.name}`}
        action={
          <Button variant="outline" size="sm" render={<Link href={`/customers/${id}`} />}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        }
      />
      <div className="rounded-lg border bg-card p-6 shadow-sm max-w-2xl">
        <CustomerForm
          initialData={customer}
          onSubmit={handleSubmit}
          isLoading={update.isPending}
          submitLabel="Update Customer"
        />
      </div>
    </div>
  );
}
