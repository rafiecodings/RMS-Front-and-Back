"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared";
import type { Customer, CustomerFormData } from "@/lib/types";

interface CustomerFormProps {
  initialData?: Customer;
  onSubmit: (data: CustomerFormData) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  [key: string]: string | undefined;
}

export function CustomerForm({
  initialData,
  onSubmit,
  isLoading,
  submitLabel = "Save Customer",
}: CustomerFormProps) {
const [formData, setFormData] = useState<CustomerFormData & { email: string; phone: string; notes: string }>({
    name: initialData?.name ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    notes: initialData?.notes ?? "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!formData.name.trim()) {
      errs.name = "Name is required";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = "Enter a valid email address";
    }
    if (formData.phone && !/^[\d\s\-\+\(\)]{7,}$/.test(formData.phone)) {
      errs.phone = "Enter a valid phone number";
    }
    return errs;
  }

function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errs = validate();
    setErrors((prev) => ({ ...prev, [field]: errs[field] }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setTouched({ name: true, email: true, phone: true });
    if (Object.keys(errs).length === 0) {
      onSubmit({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        notes: formData.notes.trim(),
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          onBlur={() => handleBlur("name")}
          placeholder="e.g. Juan Dela Cruz"
          aria-invalid={touched.name && !!errors.name}
        />
        {touched.name && errors.name && (
          <p className="text-xs text-destructive">{errors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, email: e.target.value }))
          }
          onBlur={() => handleBlur("email")}
          placeholder="e.g. juan@example.com"
          aria-invalid={touched.email && !!errors.email}
        />
        {touched.email && errors.email && (
          <p className="text-xs text-destructive">{errors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, phone: e.target.value }))
          }
          onBlur={() => handleBlur("phone")}
          placeholder="+63 9XX XXX XXXX"
          aria-invalid={touched.phone && !!errors.phone}
        />
        {touched.phone && errors.phone && (
          <p className="text-xs text-destructive">{errors.phone}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          value={formData.notes}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, notes: e.target.value }))
          }
          placeholder="Optional notes"
          aria-invalid={touched.notes && !!errors.notes}
        />
        {touched.notes && errors.notes && (
          <p className="text-xs text-destructive">{errors.notes}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
