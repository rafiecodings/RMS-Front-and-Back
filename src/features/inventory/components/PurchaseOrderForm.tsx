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
import { useIngredients, useSuppliers } from "@/lib/hooks";
import { Plus, Trash2 } from "lucide-react";
import type { PurchaseOrderFormData } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface PurchaseOrderFormProps {
  onSubmit: (data: PurchaseOrderFormData) => void;
  isLoading?: boolean;
}

export function PurchaseOrderForm({ onSubmit, isLoading }: PurchaseOrderFormProps) {
  const router = useRouter();
  const { list: suppliersList } = useSuppliers({ per_page: 200 });
  const { list: ingredientsList } = useIngredients({ per_page: 200 });

  const suppliers = (suppliersList.data?.data?.data ?? []).filter((s) => s.is_active);
  const ingredients = ingredientsList.data?.data?.data ?? [];

  const [form, setForm] = useState<PurchaseOrderFormData>({
    supplier_id: "",
    expected_date: "",
    notes: "",
    items: [{ ingredient_id: "", quantity: 1, unit_cost: 0 }],
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.supplier_id || form.items.length === 0) return;
    onSubmit(form);
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ingredient_id: "", quantity: 1, unit_cost: 0 }],
    }));
  }

  function removeItem(index: number) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  function updateItem(index: number, field: "ingredient_id" | "quantity" | "unit_cost", value: string | number) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  }

  const subtotal = form.items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Purchase Order Details</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Supplier *</Label>
            <Select value={form.supplier_id} onValueChange={(v) => setForm((prev) => ({ ...prev, supplier_id: v ?? "" }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Expected Delivery (optional)</Label>
            <Input
              type="date"
              value={form.expected_date ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, expected_date: e.target.value || undefined }))}
            />
          </div>
        </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Notes (optional)</Label>
          <Input
            value={form.notes ?? ""}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value || undefined }))}
            placeholder="Optional notes"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Line Items</h3>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>

        <div className="space-y-3">
          {form.items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center">
              <Select
                value={item.ingredient_id}
                onValueChange={(v) => updateItem(idx, "ingredient_id", v ?? "")}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Select ingredient" />
                </SelectTrigger>
                <SelectContent>
                  {ingredients.map((i) => (
                    <SelectItem key={i.id} value={i.id} className="truncate">{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                className="w-24"
                placeholder="Qty"
              />
              <Input
                type="number"
                min={0}
                step={0.01}
                value={item.unit_cost}
                onChange={(e) => updateItem(idx, "unit_cost", parseFloat(e.target.value) || 0)}
                className="w-28"
                placeholder="Unit cost"
              />
              <span className="text-sm tabular-nums w-24 text-right">
                {formatCurrency(item.quantity * item.unit_cost)}
              </span>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeItem(idx)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="border-t pt-3 flex justify-end">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Subtotal</p>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(subtotal)}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !form.supplier_id || form.items.length === 0 || form.items.some((i) => !i.ingredient_id)}
        >
          {isLoading ? "Creating..." : "Create Purchase Order"}
        </Button>
      </div>
    </form>
  );
}
