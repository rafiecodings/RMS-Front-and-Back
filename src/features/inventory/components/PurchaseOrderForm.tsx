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

  const suppliers = suppliersList.data?.data?.data ?? [];
  const ingredients = ingredientsList.data?.data?.data ?? [];

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState<PurchaseOrderFormData>({
    supplier_id: "",
    order_date: today,
    expected_delivery_date: "",
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
            <label className="text-sm font-medium">Supplier *</label>
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
            <label className="text-sm font-medium">Order Date *</label>
            <Input
              type="date"
              value={form.order_date}
              onChange={(e) => setForm((prev) => ({ ...prev, order_date: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Expected Delivery</label>
            <Input
              type="date"
              value={form.expected_delivery_date ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, expected_delivery_date: e.target.value || undefined }))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Notes</label>
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
            <div key={idx} className="flex items-center gap-2">
              <Select
                value={item.ingredient_id}
                onValueChange={(v) => updateItem(idx, "ingredient_id", v ?? "")}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select ingredient" />
                </SelectTrigger>
                <SelectContent>
                  {ingredients.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
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
