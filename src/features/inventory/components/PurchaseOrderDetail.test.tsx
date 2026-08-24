import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PurchaseOrderDetail } from "./PurchaseOrderDetail";
import { useAuth } from "@/providers/AuthProvider";
import type { PurchaseOrder, PurchaseOrderStatus } from "@/lib/types";

vi.mock("@/providers/AuthProvider");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children?: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function setRole(role: string) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: "user-1", role } as never,
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>);
}

function makeOrder(status: PurchaseOrderStatus): PurchaseOrder {
  return {
    id: "po-1",
    po_number: "PO-1",
    supplier_id: "s-1",
    supplier: { id: "s-1", name: "Supplier A", is_active: true, created_at: "2026-01-01", updated_at: "2026-01-01" },
    status,
    total_amount: 100,
    items: [],
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  } as PurchaseOrder;
}

describe("PurchaseOrderDetail status flow", () => {
  it("offers Confirm and Cancel for a pending order", () => {
    setRole("admin");
    render(<PurchaseOrderDetail order={makeOrder("pending")} onStatusChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("offers Receive and Cancel for a confirmed order", () => {
    setRole("admin");
    render(<PurchaseOrderDetail order={makeOrder("confirmed")} onStatusChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Receive" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("invokes onStatusChange with the chosen status after confirmation", async () => {
    setRole("admin");
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(<PurchaseOrderDetail order={makeOrder("pending")} onStatusChange={onStatusChange} />);
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Confirm" }));
    expect(onStatusChange).toHaveBeenCalledWith("confirmed");
  });

  it("hides Confirm for inventory staff (confirmation requires manager/admin)", () => {
    setRole("inventory_staff");
    render(<PurchaseOrderDetail order={makeOrder("pending")} onStatusChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });
});
