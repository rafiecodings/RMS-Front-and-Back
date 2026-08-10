"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
}

const UNITS = ["kg", "g", "mg", "L", "mL", "oz", "lb", "pcs", "bunch", "pack"];
const CATEGORIES = ["meat", "seafood", "vegetables", "fruits", "dairy", "grains", "spices", "condiments", "pantry", "beverages", "other"];

export function IngredientForm({ initialData, onSubmit, isLoading }: IngredientFormProps) {
  const router = useRouter();
  const { list: suppliersList } = useSuppliers({ per_page: 100 });
  const suppliers = suppliersList.data?.data?.data ?? [];

  const [form, setForm] = useState<IngredientFormData>({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    unit: initialData?.unit ?? "kg",
    current_stock: initialData?.current_stock ?? 0,
    minimum_stock: initialData?.minimum_stock ?? 0,
    maximum_stock: initialData?.maximum_stock ?? 100,
    cost_per_unit: initialData?.cost_per_unit ?? 0,
    category: initialData?.category ?? "",
    supplier_id: initialData?.supplier_id ?? "",
    expiry_date: initialData?.expiry_date ?? "",
    storage_location: initialData?.storage_location ?? "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  function update<K extends keyof IngredientFormData>(key: K, value: IngredientFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name *</label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Chicken Breast"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
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
          <label className="text-sm font-medium">Description</label>
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
            <label className="text-sm font-medium">Unit *</label>
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
            <label className="text-sm font-medium">Current Stock *</label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.current_stock}
              onChange={(e) => update("current_stock", parseFloat(e.target.value) || 0)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Minimum Stock *</label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.minimum_stock}
              onChange={(e) => update("minimum_stock", parseFloat(e.target.value) || 0)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Maximum Stock *</label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.maximum_stock}
              onChange={(e) => update("maximum_stock", parseFloat(e.target.value) || 0)}
              required
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Cost per Unit *</label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.cost_per_unit}
              onChange={(e) => update("cost_per_unit", parseFloat(e.target.value) || 0)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Supplier</label>
            <Select value={form.supplier_id ?? "none"} onValueChange={(v) => update("supplier_id", v === "none" || v === null ? undefined : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Additional Details</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Storage Location</label>
            <Input
              value={form.storage_location ?? ""}
              onChange={(e) => update("storage_location", e.target.value || undefined)}
              placeholder="e.g. Walk-in Cooler A"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Expiry Date</label>
            <Input
              type="date"
              value={form.expiry_date ?? ""}
              onChange={(e) => update("expiry_date", e.target.value || undefined)}
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
