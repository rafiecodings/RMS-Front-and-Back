"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, EmptyState, LoadingSpinner } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSuppliers } from "@/lib/hooks";
import { Pencil, Mail, Phone } from "lucide-react";

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { list } = useSuppliers({ per_page: 200 });
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
        action={<Button onClick={() => router.push("/inventory/suppliers")}>Back to Suppliers</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.name}
        description={supplier.contact_person}
        action={
          <Button render={<Link href={`/inventory/suppliers/${id}/edit`} />}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
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
          {new Date(supplier.created_at).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}
