"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Supplier, SupplierFormData } from "@/lib/types";

interface SupplierFormProps {
  initialData?: Supplier;
  onSubmit: (data: SupplierFormData) => void;
  isLoading?: boolean;
  existingNames?: string[];
}

export function SupplierForm({
  initialData,
  onSubmit,
  isLoading,
  existingNames = [],
}: SupplierFormProps) {
  const router = useRouter();

  const [form, setForm] = useState<SupplierFormData>({
    name: initialData?.name ?? "",
    contact_person: initialData?.contact_person ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    address: initialData?.address ?? "",
    payment_terms: initialData?.payment_terms ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    const name = (form.name ?? "").trim();
    if (!name) next.name = "Name is required";
    else if (existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
      next.name = "A supplier with this name already exists";
    }
    if (form.email && !EMAIL_RE.test(form.email)) {
      next.email = "Enter a valid email address";
    }
    return next;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit({
      ...form,
      name: name(form.name),
      contact_person: form.contact_person?.trim() || undefined,
      email: form.email?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
      address: form.address?.trim() || undefined,
      payment_terms: form.payment_terms?.trim() || undefined,
    });
  }

  function name(value: string | undefined): string {
    return (value ?? "").trim();
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
            <Label className="text-sm font-medium">Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Fresh Produce Co."
              required
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Contact Person</Label>
            <Input
              value={form.contact_person ?? ""}
              onChange={(e) => update("contact_person", e.target.value || undefined)}
              placeholder="e.g. John Smith"
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Email</Label>
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => update("email", e.target.value || undefined)}
              placeholder="supplier@example.com"
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Phone</Label>
            <Input
              value={form.phone ?? ""}
              onChange={(e) => update("phone", e.target.value || undefined)}
              placeholder="+63 912 345 6789"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Address</Label>
          <Input
            value={form.address ?? ""}
            onChange={(e) => update("address", e.target.value || undefined)}
            placeholder="Full address"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Payment Terms</Label>
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
