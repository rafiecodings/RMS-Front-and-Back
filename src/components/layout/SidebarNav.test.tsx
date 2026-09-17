import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NavLinks } from "./SidebarNav";

const state = vi.hoisted(() => ({ role: "waiter" as string }));
vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u", role: state.role } }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));

function getGroupItems(header: string) {
  const el = screen.queryByText(header);
  const group = el?.closest("div");
  return group ? Array.from(group.querySelectorAll("a")).map((a) => a.textContent) : [];
}

describe("Sidebar manuscript scope", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it.each([["waiter"], ["cashier"], ["kitchen_staff"], ["inventory_staff"], ["admin"], ["manager"]])(
    "%s never sees My Attendance (hidden from defense UI)",
    (role) => {
      state.role = role;
      render(<NavLinks />);
      expect(screen.queryByText("My Attendance")).not.toBeInTheDocument();
    }
  );

  it("admin Reports shows Revenue/Sales/Menu/Inventory only", () => {
    state.role = "admin";
    render(<NavLinks />);
    const reports = getGroupItems("Reports");
    expect(reports.some((t) => t?.includes("Revenue"))).toBe(true);
    expect(reports.some((t) => t?.includes("Sales"))).toBe(true);
    expect(reports.some((t) => t?.includes("Menu"))).toBe(true);
    expect(reports.some((t) => t?.includes("Inventory"))).toBe(true);
    expect(reports.some((t) => t?.includes("Customers"))).toBe(false);
    expect(reports.some((t) => t?.includes("Staff"))).toBe(false);
    expect(reports.some((t) => t?.includes("Tax"))).toBe(false);
  });

  it("manager Reports matches admin scope", () => {
    state.role = "manager";
    render(<NavLinks />);
    const reports = getGroupItems("Reports");
    expect(reports.some((t) => t?.includes("Revenue"))).toBe(true);
    expect(reports.some((t) => t?.includes("Inventory"))).toBe(true);
    expect(reports.some((t) => t?.includes("Tax"))).toBe(false);
  });

  it("inventory_staff Operations has no attendance link", () => {
    state.role = "inventory_staff";
    render(<NavLinks />);
    const ops = getGroupItems("Operations");
    expect(ops.some((t) => t?.includes("My Attendance"))).toBe(false);
    expect(screen.getByText("Inventory")).toBeInTheDocument();
  });

  it("does not duplicate or move inventory pages", () => {
    state.role = "inventory_staff";
    render(<NavLinks />);
    expect(screen.getByText("Inventory")).toBeInTheDocument();
    const ops = getGroupItems("Operations");
    expect(ops.some((t) => t?.includes("Ingredients"))).toBe(false);
  });
});
