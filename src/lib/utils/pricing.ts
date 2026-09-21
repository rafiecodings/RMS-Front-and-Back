/**
 * Authoritative order-totals math for the frontend.
 *
 * This mirrors app/Services/PricingService::orderTotals on the backend exactly
 * so the live POS cart agrees with the server-computed tax_amount/total. The
 * backend remains the source of truth for the recorded order; this helper only
 * keeps the on-screen cart/receipt consistent with it. Never compute a
 * different VAT formula client-side.
 */

export interface OrderTotalsInput {
  subtotal: number;
  discountAmount?: number;
  /** Already-computed service-charge amount (in currency units). */
  serviceChargeAmount?: number;
  /** Configured VAT rate as a percentage, e.g. 12 for 12%. */
  taxRate: number;
  /** Whether menu prices are VAT-inclusive (production default: true). */
  vatInclusive?: boolean;
  /** Whether VAT is enabled at all (production default: true). */
  vatEnabled?: boolean;
}

export interface OrderTotals {
  subtotal: number;
  discountAmount: number;
  serviceChargeAmount: number;
  vatAmount: number;
  totalAmount: number;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function computeOrderTotals(input: OrderTotalsInput): OrderTotals {
  const subtotal = round2(input.subtotal);
  const discountAmount = round2(Math.min(Math.max(0, input.discountAmount ?? 0), subtotal));
  const serviceChargeAmount = input.serviceChargeAmount ? round2(input.serviceChargeAmount) : 0;
  const gross = round2(Math.max(0, subtotal - discountAmount + serviceChargeAmount));
  const taxRate = Math.max(0, input.taxRate);
  const vatInclusive = input.vatInclusive ?? true;
  const vatEnabled = input.vatEnabled ?? true;

  let vatAmount = 0;
  if (vatEnabled && taxRate > 0 && gross > 0) {
    if (vatInclusive) {
      const vatable = round2(gross / (1 + taxRate / 100));
      vatAmount = round2(gross - vatable);
    } else {
      vatAmount = round2(gross * (taxRate / 100));
    }
  }

  const totalAmount = vatInclusive ? gross : round2(gross + vatAmount);

  return {
    subtotal,
    discountAmount,
    serviceChargeAmount,
    vatAmount,
    totalAmount,
  };
}
