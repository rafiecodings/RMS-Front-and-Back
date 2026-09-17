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
import { LoadingSpinner } from "@/components/shared";

interface RecordDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { ingredient_id: string; quantity: number; notes?: string }) => void;
  isLoading?: boolean;
  ingredientId?: string;
  ingredientName?: string;
  ingredientUnit?: string;
}

export function RecordDeliveryDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  ingredientId,
  ingredientName,
  ingredientUnit,
}: RecordDeliveryDialogProps) {
  const [quantity, setQuantity] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!ingredientId) {
      setError("No ingredient selected.");
      return;
    }
    if (quantity == null || !(Number(quantity) > 0)) {
      setError("Quantity must be greater than zero.");
      return;
    }
    onSubmit({
      ingredient_id: ingredientId,
      quantity: Number(quantity),
      notes: notes.trim() || undefined,
    });
  }

  function handleClose(open: boolean) {
    onOpenChange(open);
    if (!open) {
      setQuantity(undefined);
      setNotes("");
      setError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md w-[calc(100vw-24px)]">
        <DialogHeader>
          <DialogTitle>Record Stock Delivery</DialogTitle>
          <DialogDescription>
            Add newly received stock{ingredientName ? ` to ${ingredientName}` : ""}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quantity *{ingredientUnit ? ` (${ingredientUnit})` : ""}</Label>
            <Input
              type="number"
              min={0.01}
              step={0.01}
              value={quantity ?? ""}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              placeholder="Enter delivered quantity"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional delivery notes"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !ingredientId}>
              {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
              {isLoading ? "Saving..." : "Record Delivery"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
