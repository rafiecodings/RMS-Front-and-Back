import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RevenuePage from "@/app/(protected)/reports/revenue/page";
import CustomerPage from "@/app/(protected)/reports/customers/page";
import { normalizeRevenueReport, normalizeCustomerReport } from "./normalizers";

const state = vi.hoisted(() => ({ revenue: { data: {} as unknown, isLoading: false, isError: false }, customers: { data: {} as unknown, isLoading: false, isError: false } }));
vi.mock("./hooks/useReports", () => ({ useRevenueReport: () => state.revenue, useCustomerReport: () => state.customers }));
vi.mock("@/features/reports", () => ({
  ReportFilters: () => <div>Filters</div>,
  ExportButton: () => <button>Export CSV</button>,
  ReportSummaryCard: ({ title, value }: { title: string; value: number }) => <div>{title}: {value}</div>,
  RevenueChart: ({ data, title }: { data: { revenue: number }[]; title: string }) => <div>{title}: {data[0]?.revenue ?? 0}</div>,
  OrdersChart: () => <div>Orders trend</div>,
}));

beforeEach(() => {
  state.revenue = { isLoading: false, isError: false, data: normalizeRevenueReport({ summary: { gross_revenue: 224, refunds: 20, net_revenue: 204, total_orders: 2, avg_order_value: 102 }, daily: [{ date: "2026-09-10", revenue: 204, orders: 2 }] }) };
  state.customers = { isLoading: false, isError: false, data: normalizeCustomerReport({ summary: { total_customers: 5, loyal_customers: 4, new_in_period: 2, loyalty_tiers: { Gold: 1 } }, top_customers: [{ id: "c", name: "Ada", visit_count: 20, total_spent: 2000, loyalty_tier: "Gold" }] }) };
});

describe("report pages", () => {
  it("renders gross, refunds, net, order count and the net daily trend", () => {
    render(<RevenuePage />);
    for (const text of ["Gross Revenue: 224", "Refunds: 20", "Net Revenue: 204", "Average Order Value: 102", "Paid Completed Orders: 2", "Net Revenue Trend: 204"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });
  it("renders actual customer visits, loyal counts and tier distribution", () => {
    render(<CustomerPage />);
    expect(screen.getByText("Loyal Customers: 4")).toBeInTheDocument();
    expect(screen.getByText("New (period): 2")).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "20" })).toBeInTheDocument();
    expect(screen.getByText("1 customers")).toBeInTheDocument();
    expect(screen.getByText(/lifetime totals/)).toBeInTheDocument();
  });
  it("renders a customer empty state safely", () => {
    state.customers.data = normalizeCustomerReport(null);
    render(<CustomerPage />);
    expect(screen.getByText("No registered customers yet.")).toBeInTheDocument();
  });
  it("does not show summary data when revenue failed", () => {
    state.revenue.isError = true;
    render(<RevenuePage />);
    expect(screen.getByText(/Failed to load the revenue report/)).toBeInTheDocument();
    expect(screen.queryByText("Net Revenue: 204")).not.toBeInTheDocument();
  });
});
