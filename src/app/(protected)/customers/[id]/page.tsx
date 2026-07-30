"use client";

import { use } from "react";
import Link from "next/link";
import { PageHeader, LoadingSpinner } from "@/components/shared";
import { CustomerDetail } from "@/features/customers";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useCustomers } from "@/lib/hooks";

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { list } = useCustomers();

  const customers = list.data?.data?.data ?? [];
  const customer = customers.find((c) => c.id === id);

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
          description="The customer you're looking for doesn't exist."
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
        title="Customer Details"
        action={
          <Button variant="outline" size="sm" render={<Link href="/customers" />}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        }
      />
      <CustomerDetail customer={customer} />
    </div>
  );
}
