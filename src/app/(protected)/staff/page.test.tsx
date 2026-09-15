import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffPage from "./page";

const state = vi.hoisted(() => ({
  role: "admin" as string,
  staff: [] as unknown[],
  shifts: [] as unknown[],
}));
vi.mock("@/features/staff/components/AddStaffDialog", () => ({ AddStaffDialog: () => null }));
vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u", role: state.role } }) }));
vi.mock("@/lib/hooks", async () => {
  const actual = await vi.importActual<typeof import("@/lib/hooks")>("@/lib/hooks");
  return {
    ...actual,
    useStaff: () => ({ list: { data: { data: { data: state.staff } }, isLoading: false } }),
    useShiftSchedule: () => ({ list: { data: { data: { data: state.shifts } }, isLoading: false } }),
    useUsers: () => ({ create: { mutateAsync: vi.fn(), isPending: false }, list: { data: { data: { data: [] } }, isLoading: false } }),
  };
});

describe("Staff hub", () => {
  beforeEach(() => { vi.clearAllMocks(); state.role = "admin"; });

  it("shows Leave Management for admin", () => {
    render(<StaffPage />);
    expect(screen.getByText("Leave Management")).toBeInTheDocument();
    expect(screen.getByText("Review and manage staff leave requests")).toBeInTheDocument();
    const link = screen.getByText("Leave Management").closest("a");
    expect(link?.getAttribute("href")).toBe("/staff/leave");
  });

  it("shows Leave Management for manager", () => {
    state.role = "manager";
    render(<StaffPage />);
    expect(screen.getByText("Leave Management")).toBeInTheDocument();
  });

  it("hides Leave Management from operational roles", () => {
    state.role = "waiter";
    render(<StaffPage />);
    expect(screen.queryByText("Leave Management")).not.toBeInTheDocument();
    state.role = "cashier";
    const { container } = render(<StaffPage />);
    expect(container.textContent).not.toContain("/staff/leave");
  });

  it("keeps hub order Employees, Shift Schedule, Attendance, Leave Management, Performance", () => {
    state.role = "admin";
    const { container } = render(<StaffPage />);
    const headings = Array.from(container.querySelectorAll("h3")).map((h) => h.textContent);
    expect(headings).toEqual(["Employees", "Shift Schedule", "Attendance", "Leave Management", "Performance"]);
  });
});
