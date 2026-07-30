"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Supplier, SupplierFormData } from "@/lib/types";

interface SupplierFormProps {
  initialData?: Supplier;
  onSubmit: (data: SupplierFormData) => void;
  isLoading?: boolean;
}

export function SupplierForm({ initialData, onSubmit, isLoading }: SupplierFormProps) {
  const router = useRouter();

  const [form, setForm] = useState<SupplierFormData>({
    name: initialData?.name ?? "",
    contact_person: initialData?.contact_person ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    address: initialData?.address ?? "",
    payment_terms: initialData?.payment_terms ?? "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  function update<K extends keyof SupplierFormData>(key: K, value: SupplierFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Supplier Details</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name *</label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Fresh Produce Co."
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Contact Person</label>
            <Input
              value={form.contact_person ?? ""}
              onChange={(e) => update("contact_person", e.target.value || undefined)}
              placeholder="e.g. John Smith"
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => update("email", e.target.value || undefined)}
              placeholder="supplier@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone</label>
            <Input
              value={form.phone ?? ""}
              onChange={(e) => update("phone", e.target.value || undefined)}
              placeholder="+63 912 345 6789"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Address</label>
          <Input
            value={form.address ?? ""}
            onChange={(e) => update("address", e.target.value || undefined)}
            placeholder="Full address"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Payment Terms</label>
          <Input
            value={form.payment_terms ?? ""}
            onChange={(e) => update("payment_terms", e.target.value || undefined)}
            placeholder="e.g. Net 30, Cash on Delivery"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !form.name}>
          {isLoading ? "Saving..." : initialData ? "Update Supplier" : "Create Supplier"}
        </Button>
      </div>
    </form>
  );
}
