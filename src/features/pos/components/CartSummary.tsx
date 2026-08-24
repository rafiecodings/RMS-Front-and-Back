"use client";

import { Separator } from "@/components/ui/separator";
import { Percent, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { PosDiscount } from "../types";
import { useTaxRate } from "@/features/settings/hooks/useSettings";

interface CartSummaryProps {
  subtotal: number;
  discountAmount: number;
  discount?: PosDiscount;
  vatAmount: number;
  serviceChargeAmount: number;
  serviceChargePercent: number;
  totalAmount: number;
  onEditDiscount: () => void;
  onEditServiceCharge: () => void;
}

export function CartSummary({
  subtotal,
  discountAmount,
  discount,
  vatAmount,
  serviceChargeAmount,
  serviceChargePercent,
  totalAmount,
  onEditDiscount,
  onEditServiceCharge,
}: CartSummaryProps) {
  const taxRate = useTaxRate();
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onEditDiscount}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {discount ? (
            discount.type === "percentage" ? (
              <Percent className="h-3 w-3" />
            ) : (
              <DollarSign className="h-3 w-3" />
            )
          ) : null}
          Discount
          {discount && (
            <span className="text-xs">
              ({discount.type === "percentage" ? `${discount.value}%` : formatCurrency(discount.value)})
            </span>
          )}
        </button>
        <span className={discountAmount > 0 ? "text-destructive" : ""}>
          {discountAmount > 0 ? `- ${formatCurrency(discountAmount)}` : formatCurrency(0)}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">VAT ({taxRate}%)</span>
        <span>{formatCurrency(vatAmount)}</span>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onEditServiceCharge}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-xs"
        >
          Service Charge
          {serviceChargePercent > 0 && (
            <span className="text-xs">({serviceChargePercent}%)</span>
          )}
        </button>
        <span className="text-xs">
          {serviceChargeAmount > 0 ? formatCurrency(serviceChargeAmount) : formatCurrency(0)}
        </span>
      </div>

      <Separator />

      <div className="flex items-center justify-between text-base font-bold">
        <span>Total</span>
        <span>{formatCurrency(totalAmount)}</span>
      </div>
    </div>
  );
}
