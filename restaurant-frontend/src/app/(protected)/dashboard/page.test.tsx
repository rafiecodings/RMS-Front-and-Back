import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { normalizeDashboardSummary } from "@/features/dashboard/normalizer";
import { SIDEBAR_ROLES } from "@/lib/utils/permissions";
import DashboardPage from "./page";

const { mockUseAuth, mockDashboardQuery } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockDashboardQuery: vi.fn(),
}));

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("@/lib/hooks", () => ({
  useDashboard: mockDashboardQuery,
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("@/features/dashboard", () => ({
  RevenueCards: () => <div data-testid="RevenueCards" />,
  SalesSummary: () => <div data-testid="SalesSummary" />,
  TableOccupancy: () => <div data-testid="TableOccupancy" />,
  InventoryAlerts: () => <div data-testid="InventoryAlerts" />,
  KitchenQueue: () => <div data-testid="KitchenQueue" />,
  RecentOrders: () => <div data-testid="RecentOrders" />,
  RecentActivity: () => <div data-testid="RecentActivity" />,
}));

vi.mock("@/features/reports", () => ({
  DemandForecastCard: () => <div data-testid="DemandForecastCard" />,
  InventoryForecastCard: () => <div data-testid="InventoryForecastCard" />,
}));

vi.mock("@/components/shared", () => ({
  PageHeader: () => <div data-testid="PageHeader" />,
  // Stubs that surface the props the page passes, so assertions can still read
  // the rendered copy without pulling in the real component tree.
  ErrorState: ({ message }: { message: string }) => <div role="alert">{message}</div>,
  EmptyState: ({ title, description }: { title: string; description?: string }) => (
    <div role="status">
      <p>{title}</p>
      {description ? <p>{description}</p> : null}
    </div>
  ),
  StatsCardsSkeleton: () => <div data-testid="StatsCardsSkeleton" />,
  ChartSkeleton: () => <div data-testid="ChartSkeleton" />,
  CardGridSkeleton: () => <div data-testid="CardGridSkeleton" />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

// Minimal raw payloads mirroring the server-side role filter.
const RAW: Record<string, unknown> = {
  waiter: {
    orders: { active: 3 },
    tables: { total: 2, occupied: 1 },
    kitchen: { queue_length: 2, orders_in_progress: [] },
    recent_orders: [],
    alerts: [],
    meta: { today_reservations: 1 },
  },
  cashier: {
    orders: { active: 1 },
    tables: { total: 2, occupied: 1 },
    recent_orders: [],
    meta: {},
  },
  kitchen_staff: {
    orders: { active: 2 },
    kitchen: { queue_length: 2, orders_in_progress: [] },
    recent_orders: [],
  },
  inventory_staff: {
    inventory: { low_stock_count: 1 },
    inventory_alerts: [],
    alerts: [],
  },
  admin: {
    revenue: { today: 100 },
    sales: {},
    orders: { active: 1 },
    tables: { total: 2, occupied: 1 },
    kitchen: { queue_length: 1, orders_in_progress: [] },
    top_selling_items: [],
    peak_hours: [],
    alerts: [],
    inventory_alerts: [],
    recent_orders: [],
    recent_activities: [],
    meta: { total_customers: 5 },
  },
};

function renderAs(role: string) {
  mockUseAuth.mockReturnValue({
    user: { id: "u", name: role, email: `${role}@x.com`, role },
  });
  mockDashboardQuery.mockReturnValue({
    data: normalizeDashboardSummary(RAW[role]),
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  render(<DashboardPage />);
}

describe("Dashboard page per role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("waiter sees service sections, no management cards, no error", () => {
    renderAs("waiter");
    expect(screen.queryByText(/Failed to load dashboard data/)).toBeNull();
    expect(screen.getByTestId("TableOccupancy")).toBeInTheDocument();
    expect(screen.getByTestId("RecentOrders")).toBeInTheDocument();
    expect(screen.getByTestId("KitchenQueue")).toBeInTheDocument();
    expect(screen.queryByTestId("RevenueCards")).toBeNull();
  });

  it("cashier sees POS sections only", () => {
    renderAs("cashier");
    expect(screen.queryByText(/Failed to load dashboard data/)).toBeNull();
    expect(screen.getByTestId("RecentOrders")).toBeInTheDocument();
    expect(screen.getByTestId("TableOccupancy")).toBeInTheDocument();
    expect(screen.queryByTestId("RevenueCards")).toBeNull();
    expect(screen.queryByTestId("KitchenQueue")).toBeNull();
  });

  it("kitchen staff sees the kitchen queue only", () => {
    renderAs("kitchen_staff");
    expect(screen.queryByText(/Failed to load dashboard data/)).toBeNull();
    expect(screen.getByTestId("KitchenQueue")).toBeInTheDocument();
    expect(screen.getByTestId("RecentOrders")).toBeInTheDocument();
    expect(screen.queryByTestId("RevenueCards")).toBeNull();
    expect(screen.queryByTestId("TableOccupancy")).toBeNull();
  });

  it("inventory staff sees stock alerts, no management cards", () => {
    renderAs("inventory_staff");
    expect(screen.queryByText(/Failed to load dashboard data/)).toBeNull();
    expect(screen.getByTestId("InventoryAlerts")).toBeInTheDocument();
    expect(screen.queryByTestId("RevenueCards")).toBeNull();
  });

  it("admin keeps the full dashboard", () => {
    renderAs("admin");
    expect(screen.getByTestId("RevenueCards")).toBeInTheDocument();
    expect(screen.getByTestId("TableOccupancy")).toBeInTheDocument();
  });

  it("preserves the generic error state when the query fails", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u", name: "w", email: "w@x.com", role: "waiter" },
    });
    mockDashboardQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("403"),
      refetch: vi.fn(),
    });
    render(<DashboardPage />);
    expect(screen.getByText(/Failed to load dashboard data/)).toBeInTheDocument();
  });

  it("sidebar shows Dashboard for every dashboard role", () => {
    for (const role of [
      "admin",
      "manager",
      "waiter",
      "cashier",
      "kitchen_staff",
      "inventory_staff",
    ]) {
      expect(SIDEBAR_ROLES.dashboard).toContain(role);
    }
  });
});
