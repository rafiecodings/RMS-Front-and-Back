"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
}

export function CustomerForm({
  initialData,
  onSubmit,
  isLoading,
  submitLabel = "Save Customer",
}: CustomerFormProps) {
   const [formData, setFormData] = useState<CustomerFormData>({
     name: initialData?.name ?? "",
     email: initialData?.email ?? "",
     phone: initialData?.phone ?? "",
     address: initialData?.address ?? "",
     birthday: initialData?.birthday ?? "",
     dietary_restrictions: initialData?.dietary_restrictions ?? "",
     customer_type: initialData?.customer_type ?? "walk_in",
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
    if (formData.phone && !/^[\d\s\-+()]{7,20}$/.test(formData.phone)) {
      errs.phone = "Enter a valid phone number";
    }
    return errs;
  }

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errs = validate();
    setErrors(errs);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setTouched({ name: true, email: true, phone: true });
    if (Object.keys(errs).length === 0) {
      onSubmit({
        ...formData,
        name: formData.name.trim(),
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
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

      <div className="grid gap-4 sm:grid-cols-2">
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
            placeholder="juan@example.com"
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
            value={formData.phone}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, phone: e.target.value }))
            }
            onBlur={() => handleBlur("phone")}
            placeholder="+63 917 123 4567"
            aria-invalid={touched.phone && !!errors.phone}
          />
          {touched.phone && errors.phone && (
            <p className="text-xs text-destructive">{errors.phone}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Customer Type</Label>
        <Select
          value={formData.customer_type}
          onValueChange={(val) =>
            setFormData((prev) => ({
              ...prev,
              customer_type: val as CustomerFormData["customer_type"],
            }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="walk_in">Walk-in</SelectItem>
            <SelectItem value="registered">Registered</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, address: e.target.value }))
          }
          placeholder="Street, City, Province"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="birthday">Birthday</Label>
          <Input
            id="birthday"
            type="date"
            value={formData.birthday}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, birthday: e.target.value || undefined }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dietary">Dietary Restrictions</Label>
          <Input
            id="dietary"
            value={formData.dietary_restrictions}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, dietary_restrictions: e.target.value || undefined }))
            }
            placeholder="e.g. Nut allergy, vegetarian"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, notes: e.target.value }))
          }
          placeholder="Special preferences, allergies, etc."
          rows={3}
        />
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
