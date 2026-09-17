import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CommissionsPage from "./page";

const mockUseStaff = vi.fn();
const mockUseCommissions = vi.fn();

vi.mock("@/lib/hooks", () => ({
  useStaff: (...args: unknown[]) => mockUseStaff(...args),
  useStaffCommissions: (...args: unknown[]) => mockUseCommissions(...args),
}));

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe("Staff Commissions", () => {
  it("renders human label not UUID", () => {
    mockUseStaff.mockReturnValue({ list: { data: { data: { data: [{ id: "s1", employee_id: "EMP-1", user: { name: "Joshua Mendoza" } }] } }, isLoading: false } });
    mockUseCommissions.mockReturnValue({ data: { items: [], total_commission: 0, pagination: { total: 0 } }, isLoading: false, isError: false });
    render(wrap(<CommissionsPage />));
    expect(screen.getByText("Staff Commissions")).toBeInTheDocument();
  });

  it("total commission formatted", () => {
    mockUseStaff.mockReturnValue({ list: { data: { data: { data: [{ id: "s1", employee_id: "EMP-1", user: { name: "Alice" } }] } }, isLoading: false } });
    mockUseCommissions.mockReturnValue({ data: { items: [{ id: "c1", amount: 123.45, type: "order", order: { order_number: "ORD-1", total: 500 }, created_at: new Date().toISOString() }], total_commission: 123.45, pagination: { total: 1 } }, isLoading: false, isError: false });
    render(wrap(<CommissionsPage />));
    expect(screen.getByText(/123/)).toBeInTheDocument();
  });

  it("empty safe", () => {
    mockUseStaff.mockReturnValue({ list: { data: { data: { data: [{ id: "s1", employee_id: "EMP-1", user: { name: "Bob" } }] } }, isLoading: false } });
    mockUseCommissions.mockReturnValue({ data: { items: [], total_commission: 0, pagination: { total: 0 } }, isLoading: false, isError: false });
    render(wrap(<CommissionsPage />));
    expect(screen.getByText(/No commission records/)).toBeInTheDocument();
  });

  it("error shows retry", () => {
    mockUseStaff.mockReturnValue({ list: { data: { data: { data: [] } }, isLoading: false } });
    mockUseCommissions.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() });
    render(wrap(<CommissionsPage />));
    expect(screen.getByText(/Failed to load/)).toBeInTheDocument();
  });

  it("no UUID visible", () => {
    const uuid = "675199e3-7339-46ac-b2c6-33665b1b3e6f";
    mockUseStaff.mockReturnValue({ list: { data: { data: { data: [{ id: uuid, employee_id: "EMP-1", user: { name: "Test" } }] } }, isLoading: false } });
    mockUseCommissions.mockReturnValue({ data: { items: [], total_commission: 0, pagination: { total: 0 } }, isLoading: false, isError: false });
    render(wrap(<CommissionsPage />));
    expect(screen.queryByText(uuid)).not.toBeInTheDocument();
  });
});
