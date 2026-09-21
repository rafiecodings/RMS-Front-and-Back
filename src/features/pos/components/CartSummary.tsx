"use client";

import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { useSettings, useTaxRate } from "@/features/settings/hooks/useSettings";

interface CartSummaryProps {
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  serviceChargeAmount: number;
  serviceChargePercent: number;
  totalAmount: number;
}

export function CartSummary({
  subtotal,
  discountAmount,
  vatAmount,
  serviceChargeAmount,
  serviceChargePercent,
  totalAmount,
}: CartSummaryProps) {
  const taxRate = useTaxRate();
  const { data: settings } = useSettings();
  const vatEnabled = settings ? Boolean(settings.vat_enabled) : true;
  const vatInclusive = settings ? Boolean(settings.vat_inclusive) : true;

  // For VAT-inclusive: gross = totalAmount, vatable = totalAmount - vatAmount
  // For VAT-exclusive: gross = subtotal - discount + serviceCharge, vatable = gross
  const vatableSales = vatEnabled && vatInclusive
    ? Math.max(0, Math.round((totalAmount - vatAmount) * 100) / 100)
    : vatEnabled
      ? Math.max(0, Math.round((subtotal - discountAmount + serviceChargeAmount) * 100) / 100)
      : 0;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Eligible Promotion</span>
        <span className={discountAmount > 0 ? "text-destructive" : ""}>
          {discountAmount > 0 ? `- ${formatCurrency(discountAmount)}` : formatCurrency(0)}
        </span>
      </div>

      {vatEnabled && (
        <>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">VATable Sales</span>
            <span>{formatCurrency(vatableSales)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">VAT ({taxRate}%)</span>
            <span>{formatCurrency(vatAmount)}</span>
          </div>
        </>
      )}

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">
          Service Charge
          {serviceChargePercent > 0 && (
            <span className="text-xs">({serviceChargePercent}%)</span>
          )}
        </span>
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
