import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomerTable } from "./CustomerTable";
import { CustomerDetail } from "./CustomerDetail";
import type { Customer } from "@/lib/types";

vi.mock("next/link", () => ({ default: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));

const customer = {
  id: "c1",
  name: "Juan Dela Cruz",
  phone: "09170000001",
  email: "juan@example.com",
  total_orders: 8,
  total_reservations: 3,
  visit_count: 8,
  total_spent: 2500,
  loyalty_tier: "Bronze",
  is_active: true,
  created_at: "2026-01-01",
} as unknown as Customer;

describe("Customer manuscript scope", () => {
  it("A: table shows customer records", () => {
    render(<CustomerTable customers={[customer]} onView={vi.fn()} />);
    expect(screen.getByText("Juan Dela Cruz")).toBeInTheDocument();
  });

  it("C: table does NOT show tier labels", () => {
    render(<CustomerTable customers={[customer]} onView={vi.fn()} />);
    expect(screen.queryByText("Bronze")).not.toBeInTheDocument();
    expect(screen.queryByText("Silver")).not.toBeInTheDocument();
    expect(screen.queryByText("Gold")).not.toBeInTheDocument();
    expect(screen.queryByText("Platinum")).not.toBeInTheDocument();
    expect(screen.queryByText("Loyalty Tier")).not.toBeInTheDocument();
  });

  it("D/E: detail shows history without loyalty progress", () => {
    render(<CustomerDetail customer={customer} reservations={[]} />);
    expect(screen.getByText("Juan Dela Cruz")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.queryByText("Loyalty Tier")).not.toBeInTheDocument();
    expect(screen.queryByText(/to Bronze|to Silver|to Gold|Highest tier/)).not.toBeInTheDocument();
  });

  it("I: no loyalty points visible", () => {
    const { container } = render(<CustomerDetail customer={customer} reservations={[]} />);
    expect(container.textContent).not.toMatch(/loyalty points/i);
    expect(container.textContent).not.toMatch(/points balance/i);
  });

  it("J: no raw UUID", () => {
    const uuid = "11111111-2222-3333-4444-555555555555";
    const { container } = render(
      <CustomerTable customers={[{ ...customer, id: uuid }]} onView={vi.fn()} />
    );
    expect(container.textContent).not.toContain(uuid);
  });
});
