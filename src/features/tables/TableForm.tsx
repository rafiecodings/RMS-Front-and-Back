"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/shared";
import type { Table, TableFormData } from "@/lib/types";

interface TableFormProps {
  initialData?: Table;
  onSubmit: (data: TableFormData) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

interface FormErrors {
  name?: string;
  number?: string;
  capacity?: string;
  width?: string;
  height?: string;
}

export function TableForm({
  initialData,
  onSubmit,
  isLoading,
  submitLabel = "Save Table",
}: TableFormProps) {
  const [formData, setFormData] = useState<TableFormData>({
    name: initialData?.name ?? "",
    number: initialData?.number ?? "",
    capacity: initialData?.capacity ?? 4,
    shape: initialData?.shape ?? "rectangle",
    zone: initialData?.zone ?? "",
    section: initialData?.section ?? "",
    is_wheelchair_accessible: initialData?.is_wheelchair_accessible ?? false,
    pos_x: initialData?.pos_x ?? 0,
    pos_y: initialData?.pos_y ?? 0,
    width: initialData?.width ?? 60,
    height: initialData?.height ?? 60,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!formData.name.trim()) {
      errs.name = "Table name is required";
    }
    if (!formData.number.trim()) {
      errs.number = "Table number is required";
    }
    if (formData.capacity < 1) {
      errs.capacity = "Capacity must be at least 1";
    }
    if (formData.width < 1) {
      errs.width = "Width must be at least 1";
    }
    if (formData.height < 1) {
      errs.height = "Height must be at least 1";
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
    setTouched({ name: true, number: true, capacity: true, width: true, height: true });
    if (Object.keys(errs).length === 0) {
      onSubmit({
        ...formData,
        name: formData.name.trim(),
        zone: formData.zone?.trim() || undefined,
        section: formData.section?.trim() || undefined,
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Table Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            onBlur={() => handleBlur("name")}
            placeholder="e.g. Window Seat, Patio 1"
            aria-invalid={touched.name && !!errors.name}
          />
          {touched.name && errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>

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
          <Label htmlFor="zone">Zone</Label>
          <Input
            id="zone"
            value={formData.zone}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, zone: e.target.value }))
            }
            placeholder="e.g. Indoor, Patio, VIP"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="section">Section</Label>
          <Input
            id="section"
            value={formData.section}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, section: e.target.value }))
            }
            placeholder="e.g. A, B, Near Bar"
          />
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pos-x">Position X *</Label>
          <Input
            id="pos-x"
            type="number"
            min={0}
            value={formData.pos_x}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                pos_x: parseFloat(e.target.value) || 0,
              }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pos-y">Position Y *</Label>
          <Input
            id="pos-y"
            type="number"
            min={0}
            value={formData.pos_y}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                pos_y: parseFloat(e.target.value) || 0,
              }))
            }
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="width">Width *</Label>
          <Input
            id="width"
            type="number"
            min={1}
            value={formData.width}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                width: parseFloat(e.target.value) || 1,
              }))
            }
            onBlur={() => handleBlur("width")}
            aria-invalid={touched.width && !!errors.width}
          />
          {touched.width && errors.width && (
            <p className="text-xs text-destructive">{errors.width}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="height">Height *</Label>
          <Input
            id="height"
            type="number"
            min={1}
            value={formData.height}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                height: parseFloat(e.target.value) || 1,
              }))
            }
            onBlur={() => handleBlur("height")}
            aria-invalid={touched.height && !!errors.height}
          />
          {touched.height && errors.height && (
            <p className="text-xs text-destructive">{errors.height}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          checked={formData.is_wheelchair_accessible}
          onCheckedChange={(checked) =>
            setFormData((prev) => ({
              ...prev,
              is_wheelchair_accessible: !!checked,
            }))
          }
        />
        <span className="text-sm">Wheelchair accessible</span>
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
