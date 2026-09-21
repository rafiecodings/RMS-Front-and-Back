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

  it("VAT disabled → VAT ₱0, total = gross", () => {
    const t = computeOrderTotals({
      subtotal: 378,
      taxRate: 12,
      vatInclusive: true,
      vatEnabled: false,
    });
    expect(t.vatAmount).toBe(0);
    expect(t.totalAmount).toBe(378);
  });

  it("VAT disabled with discount → VAT ₱0, total = subtotal - discount", () => {
    const t = computeOrderTotals({
      subtotal: 500,
      discountAmount: 50,
      taxRate: 12,
      vatInclusive: true,
      vatEnabled: false,
    });
    expect(t.vatAmount).toBe(0);
    expect(t.totalAmount).toBe(450);
  });

  it("VAT disabled with service charge → VAT ₱0, total = subtotal + service charge", () => {
    const t = computeOrderTotals({
      subtotal: 378,
      serviceChargeAmount: 37.8,
      taxRate: 12,
      vatInclusive: true,
      vatEnabled: false,
    });
    expect(t.vatAmount).toBe(0);
    expect(t.totalAmount).toBe(415.8);
  });

  it("inclusive with service charge → VAT extracted from gross", () => {
    // ₱378 subtotal, ₱37.80 service charge (10% of subtotal) → gross ₱415.80
    // VAT-inclusive @12% → vatable = 415.80/1.12 = 371.25, VAT = 44.55, total = 415.80
    const t = computeOrderTotals({
      subtotal: 378,
      serviceChargeAmount: 37.8,
      taxRate: 12,
      vatInclusive: true,
    });
    expect(t.vatAmount).toBe(44.55);
    expect(t.totalAmount).toBe(415.8);
  });

  it("exclusive with service charge → VAT added on gross", () => {
    // ₱378 subtotal, ₱37.80 service charge (10% of subtotal) → gross ₱415.80
    // VAT-exclusive @12% → VAT = 49.90, total = 465.70
    const t = computeOrderTotals({
      subtotal: 378,
      serviceChargeAmount: 37.8,
      taxRate: 12,
      vatInclusive: false,
    });
    expect(t.vatAmount).toBe(49.9);
    expect(t.totalAmount).toBe(465.7);
  });

  it("inclusive with discount and service charge → VAT on gross after discount + service charge (service charge on subtotal)", () => {
    // ₱500 subtotal, ₱50 discount, ₱50 service charge (10% of subtotal) → gross ₱500
    // VAT-inclusive @12% → vatable = 500/1.12 = 446.43, VAT = 53.57, total = 500
    const t = computeOrderTotals({
      subtotal: 500,
      discountAmount: 50,
      serviceChargeAmount: 50,
      taxRate: 12,
      vatInclusive: true,
    });
    expect(t.vatAmount).toBe(53.57);
    expect(t.totalAmount).toBe(500);
  });

  it("rounding: half-cent cases handled consistently", () => {
    // ₱100 @ 12% inclusive → 100/1.12 = 89.2857... → round to 89.29, VAT = 10.71
    const t = computeOrderTotals({ subtotal: 100, taxRate: 12, vatInclusive: true });
    expect(t.vatAmount).toBe(10.71);
    expect(t.totalAmount).toBe(100);
  });

  it("frontend/backend parity: same inputs produce same outputs", () => {
    // This test documents the expected values that backend PricingService::orderTotals produces
    const cases = [
      { input: { subtotal: 378, taxRate: 12, vatInclusive: true }, expected: { vat: 40.5, total: 378 } },
      { input: { subtotal: 378, taxRate: 12, vatInclusive: false }, expected: { vat: 45.36, total: 423.36 } },
      { input: { subtotal: 500, discountAmount: 50, taxRate: 12, vatInclusive: true }, expected: { vat: 48.21, total: 450 } },
      { input: { subtotal: 100, taxRate: 12, vatInclusive: true }, expected: { vat: 10.71, total: 100 } },
    ];

    cases.forEach(({ input, expected }) => {
      const t = computeOrderTotals(input);
      expect(t.vatAmount).toBe(expected.vat);
      expect(t.totalAmount).toBe(expected.total);
    });
  });
});
