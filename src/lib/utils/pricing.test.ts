import { describe, expect, it } from "vitest";
import { computeOrderTotals } from "./pricing";

describe("computeOrderTotals (authoritative VAT)", () => {
  it("₱378 VAT-inclusive @12% → VAT ₱40.50, total ₱378.00", () => {
    const t = computeOrderTotals({ subtotal: 378, taxRate: 12, vatInclusive: true });
    expect(t.vatAmount).toBe(40.5);
    expect(t.totalAmount).toBe(378);
    expect(t.subtotal - t.discountAmount).toBe(378);
    // vatable = total - vat
    expect(Math.round((t.totalAmount - t.vatAmount) * 100) / 100).toBe(337.5);
  });

  it("₱378 VAT-exclusive @12% → VAT ₱45.36, total ₱423.36", () => {
    const t = computeOrderTotals({ subtotal: 378, taxRate: 12, vatInclusive: false });
    expect(t.vatAmount).toBe(45.36);
    expect(t.totalAmount).toBe(423.36);
  });

  it("does not add VAT again when inclusive with discount", () => {
    // ₱500 subtotal, ₱50 discount → gross ₱450, VAT ₱48.21, total ₱450.
    const t = computeOrderTotals({
      subtotal: 500,
      discountAmount: 50,
      taxRate: 12,
      vatInclusive: true,
    });
    expect(t.vatAmount).toBe(48.21);
    expect(t.totalAmount).toBe(450);
  });
});
