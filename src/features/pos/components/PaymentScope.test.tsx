import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PaymentDialog } from "./PaymentDialog";
import { PaymentHistoryTable } from "@/features/billing/components/PaymentHistoryTable";
import BillingPage from "@/app/(protected)/billing/page";

vi.mock("@/lib/hooks", () => ({
  useCustomers: () => ({ list: { data: null } }),
  useOrderEligibleTables: () => [],
}));
vi.mock("@/features/billing", async () => {
  const actual = await vi.importActual<typeof import("@/features/billing")>("@/features/billing");
  return { ...actual, useBillingStats: () => ({ data: null, isLoading: false }), useInvoices: () => ({ list: { data: null } }) };
});

const baseOrder = {
  id: "o1",
  order_number: "ORD-1",
  order_type: "takeaway",
  items: [],
  total_amount: 100,
  paid_amount: 0,
} as never;

describe("Payment manuscript scope", () => {
  it("dialog shows only Cash/Card/E-Wallet", async () => {
    render(
      <PaymentDialog open={true} onOpenChange={vi.fn()} order={{} as never} existingOrder={baseOrder} onSuccess={vi.fn()} />
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox"));
    expect(await screen.findByText("Cash")).toBeInTheDocument();
    expect(screen.getByText("Card")).toBeInTheDocument();
    expect(screen.getByText("E-Wallet")).toBeInTheDocument();
    expect(screen.queryByText("Bank Transfer")).not.toBeInTheDocument();
    expect(screen.queryByText("Gift Card")).not.toBeInTheDocument();
    expect(screen.queryByText("Loyalty Points")).not.toBeInTheDocument();
  });

  it("history filter shows only Cash/Card/E-Wallet", async () => {
    render(
      <PaymentHistoryTable payments={[]} isLoading={false} search="" onSearchChange={vi.fn()} methodFilter="all" onMethodFilterChange={vi.fn()} currentPage={1} totalPages={1} onPageChange={vi.fn()} />
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox"));
    expect(await screen.findByText("Cash")).toBeInTheDocument();
    expect(screen.queryByText("Bank Transfer")).not.toBeInTheDocument();
    expect(screen.queryByText("Gift Card")).not.toBeInTheDocument();
  });

  it("billing hub has no Refunds card", () => {
    render(<BillingPage />);
    expect(screen.queryByText("Refunds")).not.toBeInTheDocument();
    expect(screen.getByText("Invoices")).toBeInTheDocument();
    expect(screen.getByText("Payment History")).toBeInTheDocument();
  });
});
