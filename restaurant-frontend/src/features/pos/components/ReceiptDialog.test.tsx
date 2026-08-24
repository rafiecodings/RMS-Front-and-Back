import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReceiptDialog } from "./ReceiptDialog";
import type { CartItem, PaymentLine } from "../types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

// Settings fetch used by the configured-VAT label.
vi.mock("@/lib/api/client", () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: { success: true, data: { default_tax_rate: 12 } },
    }),
  },
}));

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "u1", name: "Maria Santos", role: "cashier" } }),
}));

function withProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

const items: CartItem[] = [
  {
    id: "cart-1",
    menu_item_id: "mi-1",
    name: "Adobo",
    price: 240,
    quantity: 2,
  },
];

function renderReceipt(overrides?: Partial<Parameters<typeof ReceiptDialog>[0]>) {
  const props: Parameters<typeof ReceiptDialog>[0] = {
    open: true,
    onOpenChange: vi.fn(),
    orderNumber: "ORD-TEST-1",
    items,
    subtotal: 480,
    discountAmount: 0,
    vatAmount: 57.6,
    serviceChargeAmount: 0,
    totalAmount: 537.6,
    payments: [],
    orderType: "dine_in",
    onNewOrder: vi.fn(),
    ...overrides,
  };
  return withProviders(<ReceiptDialog {...props} />);
}

function rowValue(label: string): string | undefined {
  const el = screen.getByText(label);
  return el.parentElement?.textContent;
}

describe("ReceiptDialog totals", () => {
  it("shows server totals with an exact payment and no change", () => {
    const payments: PaymentLine[] = [
      { id: "p1", method: "cash", amount: 537.6 },
    ];
    renderReceipt({ payments });

    expect(rowValue("Subtotal")).toContain("₱480");
    expect(rowValue("Total")).toContain("₱537.6");
    expect(rowValue("Amount Paid")).toContain("₱537.6");
    expect(screen.queryByText("Change")).not.toBeInTheDocument();
  });

  it("computes change on overpayment", () => {
    const payments: PaymentLine[] = [
      { id: "p1", method: "cash", amount: 600 },
    ];
    renderReceipt({ payments });

    expect(rowValue("Amount Paid")).toContain("₱600");
    expect(rowValue("Change")).toContain("₱62.4");
  });

  it("reconciles partial settlements against the balance only", () => {
    const payments: PaymentLine[] = [
      { id: "p1", method: "cash", amount: 300 },
    ];
    renderReceipt({
      payments,
      previouslyPaid: 237.6,
      amountDueForChange: 300,
    });

    expect(rowValue("Previously Paid")).toContain("₱237.6");
    expect(rowValue("Amount Paid")).toContain("₱300");
    // 300 tendered vs 300 due → exact settlement, no change row.
    expect(screen.queryByText("Change")).not.toBeInTheDocument();
  });

  it("computes change against the remaining balance, not the full total", () => {
    const payments: PaymentLine[] = [
      { id: "p1", method: "cash", amount: 350 },
    ];
    renderReceipt({
      payments,
      previouslyPaid: 237.6,
      amountDueForChange: 300,
    });

    // Tendered 350 vs due 300 → change is ₱50 even though the order
    // total is ₱537.60.
    expect(rowValue("Change")).toContain("₱50");
  });
});
