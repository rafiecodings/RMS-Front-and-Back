"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DetailPageSkeleton, PageHeader, EmptyState, ConfirmDialog, ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSuppliers } from "@/lib/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { canEdit } from "@/lib/utils/permissions";
import { formatDate } from "@/lib/utils";
import { Mail, Phone, Pencil, Power, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function apiError(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { message?: string } } })
    ?.response?.data;
  return data?.message ?? fallback;
}

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuth();
  const canManage = canEdit(user?.role, "inventory");
  const [activeConfirm, setActiveConfirm] = useState(false);

  const { list, update } = useSuppliers({ per_page: 200 });
  const suppliers = list.data?.data?.data ?? [];
  const supplier = suppliers.find((s) => s.id === id);

  if (list.isLoading) {
    return (
      <DetailPageSkeleton />
    );
  }

  if (list.isError) {
    return (
      <ErrorState
        message="Failed to load supplier. Please try again."
        onRetry={() => router.refresh()}
      />
    );
  }

  if (!supplier) {
    return (
      <EmptyState
        title="Supplier not found"
        icon={<Truck className="h-8 w-8" />}
        description="This supplier may have been deleted."
        action={<Button onClick={() => router.push("/inventory/suppliers")}>Back to Suppliers</Button>}
      />
    );
  }

  function handleToggleActive() {
    update.mutate(
      { id: supplier!.id, data: { is_active: !supplier!.is_active } },
      {
        onSuccess: () =>
          toast.success(
            supplier!.is_active ? "Supplier deactivated" : "Supplier activated"
          ),
        onError: (e) => toast.error(apiError(e, "Failed to update supplier")),
      }
    );
    setActiveConfirm(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.name}
        description={supplier.contact_person}
        action={
          canManage ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => router.push("/inventory/suppliers")}>
                Back
              </Button>
              <Button variant="outline" size="sm" render={<Link href={`/inventory/suppliers/${id}/edit`} />}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => setActiveConfirm(true)}>
                <Power className="h-4 w-4 mr-1" />
                {supplier.is_active ? "Deactivate" : "Activate"}
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => router.push("/inventory/suppliers")}>
              Back to Suppliers
            </Button>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Email</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <p className="font-medium">{supplier.email ?? "—"}</p>
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Phone</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <p className="font-medium">{supplier.phone ?? "—"}</p>
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="mt-1">
            <Badge variant={supplier.is_active ? "default" : "secondary"}>
              {supplier.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Address</p>
          <p className="font-medium mt-1">{supplier.address ?? "—"}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Payment Terms</p>
          <p className="font-medium mt-1">{supplier.payment_terms ?? "—"}</p>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <p className="text-xs text-muted-foreground">Created</p>
        <p className="font-medium mt-1">
          {formatDate(supplier.created_at)}
        </p>
      </div>

      <ConfirmDialog
        open={activeConfirm}
        onOpenChange={setActiveConfirm}
        title={supplier.is_active ? "Deactivate Supplier" : "Activate Supplier"}
        description={
          supplier.is_active
            ? `Deactivating "${supplier.name}" prevents it from being selected on new purchase orders, but existing records are retained.`
            : `Activate "${supplier.name}" to make it selectable for purchase orders again?`
        }
        confirmText={supplier.is_active ? "Deactivate" : "Activate"}
        variant={supplier.is_active ? "destructive" : "default"}
        onConfirm={handleToggleActive}
        isLoading={update.isPending}
      />
    </div>
  );
}
