"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared";
import type { Table, TableFormData } from "@/lib/types";

interface TableFormProps {
  initialData?: Table;
  onSubmit: (data: TableFormData) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

interface FormErrors {
  number?: string;
  capacity?: string;
}

export function TableForm({
  initialData,
  onSubmit,
  isLoading,
  submitLabel = "Save Table",
}: TableFormProps) {
  const [formData, setFormData] = useState<TableFormData>({
    number: initialData?.number ?? "",
    capacity: initialData?.capacity ?? 4,
    shape: initialData?.shape ?? "rectangle",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!formData.number.trim()) {
      errs.number = "Table number is required";
    }
    if (formData.capacity < 1) {
      errs.capacity = "Capacity must be at least 1";
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
    setTouched({ number: true, capacity: true });
    if (Object.keys(errs).length === 0) {
      onSubmit({
        ...formData,
        number: formData.number.trim(),
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="number">Table Number *</Label>
          <Input
            id="number"
            type="text"
            value={formData.number}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                number: e.target.value,
              }))
            }
            onBlur={() => handleBlur("number")}
            placeholder="e.g. 1, 2, A1, B2"
            aria-invalid={touched.number && !!errors.number}
          />
          {touched.number && errors.number && (
            <p className="text-xs text-destructive">{errors.number}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity *</Label>
          <Input
            id="capacity"
            type="number"
            min={1}
            max={50}
            value={formData.capacity}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                capacity: parseInt(e.target.value) || 1,
              }))
            }
            onBlur={() => handleBlur("capacity")}
            aria-invalid={touched.capacity && !!errors.capacity}
          />
          {touched.capacity && errors.capacity && (
            <p className="text-xs text-destructive">{errors.capacity}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="shape">Shape</Label>
          <select
            id="shape"
            value={formData.shape}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, shape: e.target.value }))
            }
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="rectangle">Rectangle</option>
            <option value="circle">Circle</option>
            <option value="square">Square</option>
          </select>
        </div>
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
