"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { PosDiscount } from "../types";
import { formatCurrency } from "@/lib/utils";

interface DiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDiscount?: PosDiscount;
  subtotal: number;
  onApply: (discount?: PosDiscount) => void;
}

export function DiscountDialog({
  open,
  onOpenChange,
  currentDiscount,
  subtotal,
  onApply,
}: DiscountDialogProps) {
  const [type, setType] = useState<"percentage" | "fixed">(
    currentDiscount?.type ?? "percentage"
  );
  const [value, setValue] = useState(currentDiscount?.value ?? 0);

  function handleApply() {
    if (value <= 0) {
      onApply(undefined);
    } else {
      onApply({ type, value });
    }
    onOpenChange(false);
  }

  function handleRemove() {
    onApply(undefined);
    onOpenChange(false);
  }

  const preview =
    type === "percentage"
      ? subtotal * (value / 100)
      : Math.min(value, subtotal);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Apply Discount</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={type === "percentage" ? "default" : "outline"}
              onClick={() => setType("percentage")}
              className="flex-1"
            >
              Percentage (%)
            </Button>
            <Button
              variant={type === "fixed" ? "default" : "outline"}
              onClick={() => setType("fixed")}
              className="flex-1"
            >
              Fixed Amount (₱)
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount-value">
              {type === "percentage" ? "Discount Percentage" : "Discount Amount"}
            </Label>
            <Input
              id="discount-value"
              type="number"
              min={0}
              max={type === "percentage" ? 100 : subtotal}
              step={type === "percentage" ? 1 : 0.01}
              value={value}
              onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
            />
          </div>

          {value > 0 && (
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Discount Amount</p>
              <p className="text-lg font-bold text-destructive">
                - {formatCurrency(preview)}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {currentDiscount && (
            <Button variant="destructive" onClick={handleRemove}>
              Remove Discount
            </Button>
          )}
          <Button onClick={handleApply} disabled={type === "percentage" && value > 100}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
