import type { OrderType } from "@/lib/types";

export type ReportPeriod = "today" | "yesterday" | "this_week" | "this_month" | "last_month" | "this_quarter" | "this_year" | "custom";

export type ExportFormat = "pdf" | "excel" | "csv";

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
  revenue_growth: number;
  daily_revenue: DailyRevenueData[];
  revenue_by_type: RevenueByType[];
  revenue_by_payment: RevenueByPayment[];
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

export interface SalesReport {
  total_sales: number;
  total_items_sold: number;
  average_ticket: number;
  sales_growth: number;
  sales_by_day: SalesByDay[];
  sales_by_category: SalesByCategory[];
  revenue_by_type: RevenueByType[];
  top_items: TopSalesItem[];
  bottom_items: TopSalesItem[];
}

export interface SalesByDay {
  date: string;
  sales: number;
  items: number;
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
  average_margin: number;
  item_performance: MenuItemPerformance[];
  category_performance: CategoryPerformance[];
  modifier_usage: ModifierUsage[];
}

export interface MenuItemPerformance {
  id: string;
  name: string;
  category: string;
  quantity_sold: number;
  revenue: number;
  cost: number;
  margin: number;
  margin_percentage: number;
  popularity_score: number;
}

export interface CategoryPerformance {
  category: string;
  items_count: number;
  total_sold: number;
  total_revenue: number;
  average_margin: number;
}

export interface ModifierUsage {
  modifier: string;
  count: number;
  revenue: number;
}

export interface InventoryReport {
  total_ingredients: number;
  total_stock_value: number;
  low_stock_count: number;
  stock_valuation: StockValuation[];
  consumption_variance: ConsumptionVariance[];
  wastage_summary: WastageSummary;
  top_suppliers: TopSupplier[];
}

export interface StockValuation {
  id: string;
  name: string;
  current_stock: number;
  unit: string;
  unit_cost: number;
  total_value: number;
  status: "ok" | "low" | "critical" | "out_of_stock";
}

export interface ConsumptionVariance {
  id: string;
  name: string;
  expected_usage: number;
  actual_usage: number;
  variance: number;
  variance_percentage: number;
  cost_impact: number;
}

export interface WastageSummary {
  total_wastage_count: number;
  total_wastage_cost: number;
  by_reason: { reason: string; count: number; cost: number }[];
}

export interface TopSupplier {
  id: string;
  name: string;
  orders_count: number;
  total_purchased: number;
  average_delivery_days: number;
}

export interface StaffReport {
  total_staff: number;
  active_staff: number;
  total_labor_cost: number;
  labor_cost_percentage: number;
  attendance_summary: AttendanceSummary;
  performance_ranking: StaffPerformanceRanking[];
  shift_coverage: ShiftCoverage[];
  clock_summary: ClockSummary;
}

export interface AttendanceSummary {
  total_records: number;
  present: number;
  absent: number;
  late: number;
  on_leave: number;
  attendance_rate: number;
}

export interface StaffPerformanceRanking {
  id: string;
  name: string;
  role: string;
  orders_handled: number;
  revenue_generated: number;
  average_rating: number;
  attendance_rate: number;
  performance_score: number;
}

export interface ShiftCoverage {
  shift: string;
  staff_count: number;
  coverage_percentage: number;
}

export interface ClockSummary {
  average_hours_per_day: number;
  overtime_hours: number;
  total_worked_hours: number;
}

export interface TaxReport {
  total_tax_collected: number;
  tax_breakdown: TaxBreakdown[];
  monthly_tax: MonthlyTax[];
  tax_by_order_type: TaxByOrderType[];
}

export interface TaxBreakdown {
  tax_type: string;
  rate: number;
  taxable_amount: number;
  tax_amount: number;
}

export interface MonthlyTax {
  month: string;
  tax_collected: number;
  taxable_sales: number;
}

export interface TaxByOrderType {
  order_type: OrderType;
  taxable_sales: number;
  tax_collected: number;
  percentage: number;
}

export interface ExportPayload {
  report_type: string;
  format: ExportFormat;
  date_from: string;
  date_to: string;
  filters?: Record<string, string>;
}
