"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/shared";
import type { MenuCategory, MenuCategoryFormData } from "@/lib/types";

interface CategoryFormProps {
  initialData?: MenuCategory;
  onSubmit: (data: MenuCategoryFormData) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function CategoryForm({
  initialData,
  onSubmit,
  isLoading,
  submitLabel = "Save Category",
}: CategoryFormProps) {
   const [formData, setFormData] = useState<MenuCategoryFormData>({
     name: initialData?.name ?? "",
     description: initialData?.description ?? "",
     sort_order: initialData?.sort_order ?? 0,
     is_active: initialData?.is_active ?? true,
   });

  const [nameError, setNameError] = useState<string>();
  const [nameTouched, setNameTouched] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNameTouched(true);
    if (!formData.name.trim()) {
      setNameError("Category name is required");
      return;
    }
    setNameError(undefined);
    onSubmit({
      ...formData,
      name: formData.name.trim(),
      description: formData.description?.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cat-name">Name *</Label>
        <Input
          id="cat-name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          onBlur={() => {
            setNameTouched(true);
            if (!formData.name.trim()) setNameError("Category name is required");
            else setNameError(undefined);
          }}
          placeholder="e.g. Appetizers, Main Course, Desserts"
          aria-invalid={nameTouched && !!nameError}
        />
        {nameTouched && nameError && (
          <p className="text-xs text-destructive">{nameError}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cat-desc">Description</Label>
        <Input
          id="cat-desc"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Optional description"
        />
      </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cat-order">Sort Order</Label>
            <Input
              id="cat-order"
              type="number"
              min={0}
              value={formData.sort_order}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  sort_order: parseInt(e.target.value) || 0,
                }))
              }
            />
          </div>

        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_active: !!checked }))
              }
            />
            <span className="text-sm">Active</span>
          </label>
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
