"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared";
import type { FloorPlan, FloorPlanFormData } from "@/lib/types";

interface FloorPlanFormProps {
  initialData?: FloorPlan;
  onSubmit: (data: FloorPlanFormData) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function FloorPlanForm({
  initialData,
  onSubmit,
  isLoading,
  submitLabel = "Save Floor Plan",
}: FloorPlanFormProps) {
  const [formData, setFormData] = useState<FloorPlanFormData>({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
  });

  const [nameError, setNameError] = useState<string>();
  const [nameTouched, setNameTouched] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNameTouched(true);
    if (!formData.name.trim()) {
      setNameError("Floor plan name is required");
      return;
    }
    setNameError(undefined);
    onSubmit({
      name: formData.name.trim(),
      description: formData.description?.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fp-name">Name *</Label>
        <Input
          id="fp-name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          onBlur={() => {
            setNameTouched(true);
            if (!formData.name.trim()) setNameError("Floor plan name is required");
            else setNameError(undefined);
          }}
          placeholder="e.g. Main Floor, Patio, VIP Section"
          aria-invalid={nameTouched && !!nameError}
        />
        {nameTouched && nameError && (
          <p className="text-xs text-destructive">{nameError}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="fp-desc">Description</Label>
        <Input
          id="fp-desc"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Optional description"
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
