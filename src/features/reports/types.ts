import type { OrderType } from "@/lib/types";

export type ReportPeriod =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "custom";

/** Only formats the backend actually generates. */
export type ExportFormat = "csv" | "json";

export interface DateRange {
  from: string;
  to: string;
}

export interface ReportFilters {
  period: ReportPeriod;
  date_range?: DateRange;
  group_by?: "day" | "week" | "month";
}

export interface RevenueReport {
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  /** Null when no comparable previous period exists. */
  revenue_growth: number | null;
  daily_revenue: DailyRevenueData[];
}

export interface DailyRevenueData {
  date: string;
  revenue: number;
  orders: number;
}

export interface RevenueByType {
  order_type: OrderType;
  revenue: number;
  percentage: number;
}

export interface RevenueByPayment {
  method: string;
  revenue: number;
  count: number;
  percentage: number;
}

export interface HourlyDistribution {
  hour: number;
  orders: number;
  revenue: number;
}

export interface SalesReport {
  total_sales: number;
  total_items_sold: number;
  average_ticket: number;
  /** Null when no comparable previous period exists. */
  sales_growth: number | null;
  revenue_by_type: RevenueByType[];
  revenue_by_payment: RevenueByPayment[];
  hourly_distribution: HourlyDistribution[];
  sales_by_category: SalesByCategory[];
}

export interface SalesByCategory {
  category: string;
  items_sold: number;
  revenue: number;
  percentage: number;
}

export interface TopSalesItem {
  id: string;
  name: string;
  category: string;
  quantity_sold: number;
  revenue: number;
  average_price: number;
}

export interface MenuPerformanceReport {
  total_menu_items: number;
  active_items: number;
  item_performance: MenuItemPerformance[];
  bottom_items: MenuItemPerformance[];
}

export interface MenuItemPerformance {
  id: string;
  name: string;
  category: string;
  quantity_sold: number;
  revenue: number;
  order_count: number;
  /**
   * Recipe-level costing is not tracked, so per-item cost/margin are
   * intentionally unknown instead of fake zeros.
   */
  cost: number | null;
  margin: number | null;
  margin_percentage: number | null;
}

export interface InventoryReport {
  total_ingredients: number;
  low_stock_count: number;
  total_stock_value: number;
  wastage_summary: WastageSummary;
  low_stock_items: LowStockItem[];
}

export interface WastageSummary {
  total_wastage_count: number;
  total_wastage_cost: number;
  by_reason: { reason: string; count: number; quantity: number; cost: number }[];
}

export interface LowStockItem {
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
  unit_cost: number;
  unit: string;
}

export interface StaffReport {
  total_staff: number;
  active_staff: number;
  attendance_summary: AttendanceSummary;
  performance_ranking: StaffPerformanceRanking[];
}

export interface AttendanceSummary {
  total_records: number;
  present: number;
  absent: number;
  late: number;
  on_leave: number;
  /** Null when no attendance records exist in the period. */
  attendance_rate: number | null;
}

export interface StaffPerformanceRanking {
  id: string;
  name: string;
  position: string;
  role: string;
  orders_handled: number;
  revenue_generated: number;
  avg_ticket: number;
  shifts_scheduled: number;
  /** Null when the staff member has no attendance records in range. */
  attendance_rate: number | null;
}

export interface TaxReport {
  total_tax_collected: number;
  monthly_tax: MonthlyTax[];
}

export interface MonthlyTax {
  month: string;
  tax_collected: number;
}

export interface ExportPayload {
  type: string;
  format: ExportFormat;
  start_date: string;
  end_date: string;
}

export interface CustomerAnalyticsReport {
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  average_visit_frequency: number;
  average_lifetime_value: number;
  top_customers: { id: string; name: string; total_orders: number; total_spent: number }[];
}
