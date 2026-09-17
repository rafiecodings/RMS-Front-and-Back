import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReportsPage from "./page";

vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u", role: "admin" } }) }));
vi.mock("@/features/reports/hooks/useReports", () => ({
  useRevenueReport: () => ({ data: null, isLoading: false, isError: false }),
  useSalesReport: () => ({ data: null, isLoading: false, isError: false }),
  useInventoryReport: () => ({ data: null, isLoading: false, isError: false }),
}));

describe("Reports hub manuscript scope", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it.each(["Revenue", "Sales", "Menu Performance", "Inventory"])("shows %s", (title) => {
    render(<ReportsPage />);
    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it.each(["Customers", "Staff"])("hub does NOT show %s", (title) => {
    render(<ReportsPage />);
    expect(screen.queryByText(title)).not.toBeInTheDocument();
  });

  it("hub does NOT show Tax", () => {
    render(<ReportsPage />);
    expect(screen.queryByText("Tax")).not.toBeInTheDocument();
  });
});
