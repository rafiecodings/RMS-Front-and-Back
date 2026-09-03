"use client";

import { useState, use } from "react";
import Link from "next/link";
import { PageHeader, LoadingSpinner, ConfirmDialog } from "@/components/shared";
import { CustomerDetail, EditCustomerDialog } from "@/features/customers";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Archive } from "lucide-react";
import { useCustomer, useCustomers } from "@/lib/hooks";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";
import { canEdit } from "@/lib/utils/permissions";
import type { CustomerFormData } from "@/lib/types";

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: customer, isLoading, refetch } = useCustomer(id);
  const { archive, update } = useCustomers();
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { user } = useAuth();
  const canArchive = canEdit(user?.role, "customers");

  function handleArchiveConfirm() {
    archive.mutate(id, {
      onSuccess: () => {
        toast.success(`Customer ${customer?.name} archived`);
        setShowArchiveDialog(false);
        refetch();
      },
      onError: (error) => {
        const message = (error as { response?: { data?: { message?: string } } })
          .response?.data?.message;
        toast.error(message ?? "Failed to archive customer");
      },
    });
  }

  function handleUpdate(data: CustomerFormData) {
    update.mutate(
      { id, data },
      {
        onSuccess: () => {
          toast.success("Customer updated successfully");
          setShowEditDialog(false);
        },
        onError: () => toast.error("Failed to update customer"),
      }
    );
  }

  if (isLoading) {
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
          <div className="flex items-center gap-2">
            {canArchive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchiveDialog(true)}
              >
                <Archive className="h-4 w-4 mr-1.5" />
                Archive
              </Button>
            )}
            <Button variant="outline" size="sm" render={<Link href="/customers" />}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Customers
            </Button>
          </div>
        }
      />
      <CustomerDetail
        customer={customer}
        reservations={customer.reservations ?? []}
        canEdit={canArchive}
        onEdit={() => setShowEditDialog(true)}
      />

      <EditCustomerDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        customer={customer}
        onSubmit={handleUpdate}
        isLoading={update.isPending}
      />

      <ConfirmDialog
        open={showArchiveDialog}
        onOpenChange={setShowArchiveDialog}
        title="Archive Customer"
        description={`Are you sure you want to archive "${customer.name}"? This moves the customer to archived status and is recoverable.`}
        confirmText="Archive Customer"
        variant="destructive"
        onConfirm={handleArchiveConfirm}
        isLoading={archive.isPending}
      />
    </div>
  );
}
