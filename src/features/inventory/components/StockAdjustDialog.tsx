"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared";
import type { StockAdjustFormData } from "@/lib/types";

interface StockAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: StockAdjustFormData) => void;
  isLoading?: boolean;
  ingredientId?: string;
  ingredientName?: string;
}

export function StockAdjustDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  ingredientId,
  ingredientName,
}: StockAdjustDialogProps) {
  const [form, setForm] = useState<StockAdjustFormData>({
    ingredient_id: ingredientId ?? "",
    type: "in",
    quantity: undefined,
    new_stock: undefined,
    notes: "",
  });

  const isAdjustment = form.type === "adjustment";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.ingredient_id) return;
    if (isAdjustment && (form.new_stock == null || form.new_stock < 0)) return;
    if (!isAdjustment && (form.quantity == null || form.quantity <= 0)) return;
    onSubmit(form);
    onOpenChange(false);
    setForm({
      ingredient_id: ingredientId ?? "",
      type: "in",
      quantity: undefined,
      new_stock: undefined,
      notes: "",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            {ingredientName
              ? `Adjust stock for ${ingredientName}.`
              : "Record a stock movement."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Adjustment Type *</Label>
            <Select
              value={form.type}
              onValueChange={(v) =>
                setForm((p) => ({
                  ...p,
                  type: (v ?? "in") as "in" | "out" | "adjustment",
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">Stock Inward</SelectItem>
                <SelectItem value="out">Stock Outward</SelectItem>
                <SelectItem value="adjustment">Set Stock Level</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isAdjustment ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium">New Stock Level *</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.new_stock ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    new_stock: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="Enter absolute stock level"
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quantity *</Label>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={form.quantity ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    quantity: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="Enter quantity"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Notes</Label>
            <Input
              value={form.notes ?? ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, notes: e.target.value || undefined }))
              }
              placeholder="Optional notes"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !form.ingredient_id}>
              {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
