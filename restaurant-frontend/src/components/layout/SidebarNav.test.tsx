import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NavLinks } from "./SidebarNav";

const state = vi.hoisted(() => ({ role: "waiter" as string }));
vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u", role: state.role } }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));

function getOperationsItems() {
  const operationsHeader = screen.getByText("Operations");
  const group = operationsHeader.closest("div");
  return group ? Array.from(group.querySelectorAll("a")).map((a) => a.textContent) : [];
}

describe("Sidebar My Attendance grouping", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it.each([["waiter"], ["cashier"], ["kitchen_staff"], ["inventory_staff"]])("%s sees My Attendance under Operations", (role) => {
    state.role = role;
    render(<NavLinks />);
    expect(screen.getByText("My Attendance")).toBeInTheDocument();
    const ops = getOperationsItems();
    expect(ops.some((t) => t?.includes("My Attendance"))).toBe(true);
  });

  it("inventory_staff Operations contains only My Attendance", () => {
    state.role = "inventory_staff";
    render(<NavLinks />);
    const ops = getOperationsItems();
    expect(ops).toEqual(expect.arrayContaining([expect.stringContaining("My Attendance")]));
    // Should not contain Customers/Tables etc for inventory_staff
    expect(ops.some((t) => t?.includes("Customers"))).toBe(false);
    // Inventory group should still exist with 4 items
    expect(screen.getByText("Inventory")).toBeInTheDocument();
    expect(screen.getByText("Ingredients")).toBeInTheDocument();
    expect(screen.getByText("Replenishment Requests")).toBeInTheDocument();
  });

  it("waiter Operations includes My Attendance + Customers/Tables/Reservations/Orders", () => {
    state.role = "waiter";
    render(<NavLinks />);
    const ops = getOperationsItems();
    expect(ops.some((t) => t?.includes("My Attendance"))).toBe(true);
    expect(ops.some((t) => t?.includes("Customers"))).toBe(true);
    expect(ops.some((t) => t?.includes("Tables"))).toBe(true);
    expect(ops.some((t) => t?.includes("Reservations"))).toBe(true);
    expect(ops.some((t) => t?.includes("Orders"))).toBe(true);
  });

  it("no duplicate My Attendance", () => {
    state.role = "waiter";
    render(<NavLinks />);
    expect(screen.getAllByText("My Attendance").length).toBe(1);
  });

  it("does not duplicate or move inventory pages", () => {
    state.role = "inventory_staff";
    render(<NavLinks />);
    expect(screen.getByText("Inventory")).toBeInTheDocument();
    // Inventory items should not appear under Operations
    const ops = getOperationsItems();
    expect(ops.some((t) => t?.includes("Ingredients"))).toBe(false);
  });
});
