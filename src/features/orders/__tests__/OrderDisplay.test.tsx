import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OrderTable } from "../OrderTable";
import { KotCard } from "@/features/kitchen/KotCard";
import { InvoiceDetail } from "@/features/billing/components/InvoiceDetail";
import type { Order } from "@/lib/types";
import type { Kot } from "@/lib/types";
import type { Invoice } from "@/features/billing/types";

vi.mock("next/link", () => ({ default: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock("@/features/settings/hooks/useSettings", () => ({ useTaxRate: () => 12 }));

function makeOrder(partial: Partial<Order>): Order {
  return {
    id: "o-1",
    order_number: "ORD-001",
    order_type: "dine_in",
    status: "pending",
    items: [],
    items_count: 2,
    payments: [],
    subtotal: 219,
    tax_amount: 23.46,
    discount_amount: 0,
    service_charge: 0,
    total_amount: 219,
    placed_at: "2026-09-21T12:00:00",
    created_at: "2026-09-21T12:00:00",
    updated_at: "2026-09-21T12:00:00",
    ...partial,
  } as unknown as Order;
}

const dineIn = (status: Order["status"], archived_at: string | null = null) =>
  makeOrder({
    status,
    archived_at: archived_at as unknown as undefined,
    table: { id: "t-1", number: "TBL-001" } as unknown as Order["table"],
    customer: { name: "Juan" } as unknown as Order["customer"],
  });

describe("OrderTable display", () => {
  it("renders the stored table number as-is, never TTBL-001", () => {
    const { container } = render(<OrderTable orders={[dineIn("pending")]} />);
    expect(screen.getAllByText("TBL-001").length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/TTBL-001/);
  });

  it("renders every canonical order status with a text label", () => {
    const statuses: Order["status"][] = ["pending", "confirmed", "preparing", "ready", "served", "completed", "cancelled"];
    const { unmount } = render(<OrderTable orders={[]} />);
    unmount();
    for (const status of statuses) {
      const { unmount: u } = render(<OrderTable orders={[dineIn(status)]} />);
      expect(screen.getAllByText(status, { exact: false }).length).toBeGreaterThan(0);
      u();
    }
  });

  it("shows Archive for completed orders and Restore for archived ones", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <OrderTable orders={[dineIn("completed")]} onArchive={vi.fn()} onUnarchive={vi.fn()} />
    );
    await user.click(screen.getAllByRole("button", { name: /Actions/i })[0]);
    expect(await screen.findByRole("menuitem", { name: /^Archive$/i })).toBeInTheDocument();
    unmount();

    render(
      <OrderTable
        orders={[{ ...dineIn("completed"), archived_at: "2026-09-21T13:00:00" } as unknown as Order]}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
      />
    );
    await user.click(screen.getAllByRole("button", { name: /Actions/i })[0]);
    expect(await screen.findByRole("menuitem", { name: /Restore/i })).toBeInTheDocument();
  });
});

describe("KotCard display", () => {
  function makeKot(): Kot {
    return {
      id: "k-1",
      kot_number: "KOT-001",
      status: "received",
      priority: "normal",
      station: "Grill",
      created_at: "2026-09-21T12:00:00",
      updated_at: "2026-09-21T12:00:00",
      order: {
        order_number: "ORD-001",
        order_type: "dine_in",
        table: { number: "TBL-001" },
      },
      items: [{ id: "i-1", quantity: 2, name: "Burger", status: "pending" }],
    } as unknown as Kot;
  }

  it("renders the stored table number as-is with a text status", () => {
    const { container } = render(
      <KotCard kot={makeKot()} onStatusAdvance={vi.fn()} onViewDetail={vi.fn()} onArchive={vi.fn()} />
    );
    expect(screen.getByText("TBL-001")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/TTBL-001/);
    expect(screen.getByText("Received")).toBeInTheDocument();
  });
});

describe("InvoiceDetail display", () => {
  function makeInvoice(): Invoice {
    return {
      id: "inv-1",
      invoice_number: "INV-001",
      order_type: "dine_in",
      payment_status: "unpaid",
      subtotal: 219,
      discount_amount: 0,
      tax_amount: 23.46,
      service_charge: 0,
      total_amount: 219,
      amount_paid: 0,
      balance: 219,
      items: [],
      payments: [],
      created_at: "2026-09-21T12:00:00",
      placed_at: "2026-09-21T12:00:00",
      table: { number: "TBL-001" },
      customer: { name: "Juan" },
    } as unknown as Invoice;
  }

  it("renders the stored table number as-is, never TTBL-001", () => {
    const { container } = render(<InvoiceDetail invoice={makeInvoice()} onPrint={vi.fn()} />);
    expect(screen.getByText("TBL-001")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/TTBL-001/);
  });
});
