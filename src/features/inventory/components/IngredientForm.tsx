"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSuppliers } from "@/lib/hooks";
import type { Ingredient, IngredientFormData } from "@/lib/types";

interface IngredientFormProps {
  initialData?: Ingredient;
  onSubmit: (data: IngredientFormData) => void;
  isLoading?: boolean;
  existingNames?: string[];
}

const UNITS = ["kg", "g", "mg", "L", "mL", "oz", "lb", "pcs", "bunch", "pack"];
const CATEGORIES = ["meat", "seafood", "vegetables", "fruits", "dairy", "grains", "spices", "condiments", "pantry", "beverages", "other"];

export function IngredientForm({
  initialData,
  onSubmit,
  isLoading,
  existingNames = [],
}: IngredientFormProps) {
  const router = useRouter();
  const { list: suppliersList } = useSuppliers({ per_page: 100 });
  const suppliers = suppliersList.data?.data?.data ?? [];
  const supplierDisplay = form.supplier_id ? (suppliers.find((s) => s.id === form.supplier_id)?.name ?? "Unavailable supplier") : null;

  const [form, setForm] = useState<IngredientFormData>({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    unit: initialData?.unit ?? "kg",
    current_stock: initialData?.current_stock ?? 0,
    minimum_stock: initialData?.minimum_stock ?? 0,
    maximum_stock: initialData?.maximum_stock ?? 100,
    cost_per_unit: initialData?.cost_per_unit ?? 0,
    category: initialData?.category ?? "",
    supplier_id: initialData?.supplier_id ?? initialData?.supplier?.id ?? "",
    storage_location: initialData?.storage_location ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    const name = (form.name ?? "").trim();
    if (!name) next.name = "Name is required";
    else if (
      existingNames.some((n) => n.toLowerCase() === name.toLowerCase())
    ) {
      next.name = "An ingredient with this name already exists";
    }
    if (!form.unit) next.unit = "Unit is required";
    if ((form.current_stock ?? 0) < 0) next.current_stock = "Cannot be negative";
    if ((form.minimum_stock ?? 0) < 0) next.minimum_stock = "Cannot be negative";
    if ((form.maximum_stock ?? 0) < 0) next.maximum_stock = "Cannot be negative";
    if ((form.minimum_stock ?? 0) > (form.maximum_stock ?? 0)) {
      next.minimum_stock = "Minimum cannot exceed maximum";
    }
    if ((form.cost_per_unit ?? 0) < 0) next.cost_per_unit = "Cannot be negative";
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
      description: form.description?.trim() || undefined,
      supplier_id: form.supplier_id || undefined,
    });
  }

  function update<K extends keyof IngredientFormData>(key: K, value: IngredientFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function name(value: string | undefined): string {
    return (value ?? "").trim();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Chicken Breast"
              required
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Category (optional)</Label>
            <Select value={form.category ?? "none"} onValueChange={(v) => update("category", v === "none" || v === null ? undefined : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Description</Label>
          <Input
            value={form.description ?? ""}
            onChange={(e) => update("description", e.target.value || undefined)}
            placeholder="Optional description"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Stock & Pricing</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Unit *</Label>
            <Select value={form.unit} onValueChange={(v) => update("unit", v ?? form.unit)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Current Stock *</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.current_stock}
              onChange={(e) => update("current_stock", parseFloat(e.target.value) || 0)}
              required
              aria-invalid={!!errors.current_stock}
            />
            {errors.current_stock && <p className="text-xs text-destructive">{errors.current_stock}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Minimum Stock *</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.minimum_stock}
              onChange={(e) => update("minimum_stock", parseFloat(e.target.value) || 0)}
              required
              aria-invalid={!!errors.minimum_stock}
            />
            {errors.minimum_stock && <p className="text-xs text-destructive">{errors.minimum_stock}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Maximum Stock *</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.maximum_stock}
              onChange={(e) => update("maximum_stock", parseFloat(e.target.value) || 0)}
              required
              aria-invalid={!!errors.maximum_stock}
            />
            {errors.maximum_stock && <p className="text-xs text-destructive">{errors.maximum_stock}</p>}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cost per Unit (PHP) *</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.cost_per_unit}
              onChange={(e) => update("cost_per_unit", parseFloat(e.target.value) || 0)}
              required
              aria-invalid={!!errors.cost_per_unit}
            />
            {errors.cost_per_unit && <p className="text-xs text-destructive">{errors.cost_per_unit}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Supplier (optional)</Label>
            <Select value={form.supplier_id || "none"} onValueChange={(v) => update("supplier_id", v === "none" || v === null ? undefined : v)}>
              <SelectTrigger>
                {supplierDisplay ? <span className="truncate">{supplierDisplay}</span> : <SelectValue placeholder="No supplier" />}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="truncate">{s.name}</SelectItem>
                ))}
                {form.supplier_id && !suppliers.some((s) => s.id === form.supplier_id) && (
                  <SelectItem value={form.supplier_id} disabled className="truncate">
                    Unavailable supplier
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Additional Details</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Storage Location</Label>
            <Input
              value={form.storage_location ?? ""}
              onChange={(e) => update("storage_location", e.target.value || undefined)}
              placeholder="e.g. Walk-in Cooler A"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !form.name}>
          {isLoading ? "Saving..." : initialData ? "Update Ingredient" : "Create Ingredient"}
        </Button>
      </div>
    </form>
  );
}
