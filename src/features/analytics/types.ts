import type { OrderType } from "@/lib/types";

export type AnalyticsPeriod = "today" | "yesterday" | "this_week" | "this_month" | "last_month" | "this_quarter" | "this_year" | "custom";

export interface DateRange {
  from: string;
  to: string;
}

export interface AnalyticsFilters {
  period: AnalyticsPeriod;
  date_range?: DateRange;
}

export interface RevenueAnalytics {
  total_revenue: number;
  revenue_growth: number;
  average_order_value: number;
  revenue_by_hour: RevenueByHour[];
  revenue_by_day: RevenueByDay[];
  revenue_by_type: RevenueByType[];
  revenue_trend: RevenueTrend[];
}

export interface RevenueByHour {
  hour: number;
  revenue: number;
  orders: number;
}

export interface RevenueByDay {
  date: string;
  revenue: number;
  orders: number;
}

export interface RevenueByType {
  order_type: OrderType;
  revenue: number;
  percentage: number;
}

export interface RevenueTrend {
  date: string;
  revenue: number;
  previous_period_revenue: number;
}

export interface SalesTrends {
  total_sales: number;
  sales_growth: number;
  total_items_sold: number;
  average_ticket: number;
  sales_by_hour: SalesByHour[];
  sales_by_category: SalesByCategoryTrend[];
  sales_by_day: SalesByDay[];
  top_items: BestSellingItem[];
}

export interface SalesByHour {
  hour: number;
  items_sold: number;
  revenue: number;
}

export interface SalesByCategoryTrend {
  category: string;
  items_sold: number;
  revenue: number;
  percentage: number;
}

export interface SalesByDay {
  date: string;
  items_sold: number;
  revenue: number;
}

export interface BestSellingItem {
  id: string;
  name: string;
  category: string;
  quantity_sold: number;
  revenue: number;
  average_price: number;
  trend: "up" | "down" | "stable";
}

export interface PeakHours {
  peak_hours: PeakHourData[];
  busiest_day: string;
  quietest_day: string;
  average_orders_per_hour: number;
  hourly_distribution: HourlyDistribution[];
}

export interface PeakHourData {
  hour: number;
  day_of_week: string;
  orders: number;
  revenue: number;
}

export interface HourlyDistribution {
  hour: number;
  label: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
  average: number;
}

export interface InventoryUsage {
  total_ingredients: number;
  total_usage_cost: number;
  wastage_cost: number;
  usage_by_category: UsageByCategory[];
  top_consumed: ConsumedIngredient[];
  wastage_trend: WastageTrend[];
  low_stock_alerts: LowStockAlert[];
}

export interface UsageByCategory {
  category: string;
  usage_cost: number;
  percentage: number;
}

export interface ConsumedIngredient {
  id: string;
  name: string;
  category: string;
  quantity_used: number;
  unit: string;
  cost: number;
}

export interface WastageTrend {
  date: string;
  wastage_count: number;
  wastage_cost: number;
}

export interface LowStockAlert {
  id: string;
  name: string;
  current_stock: number;
  min_threshold: number;
  unit: string;
  severity: "low" | "critical" | "out_of_stock";
}

export interface CustomerAnalytics {
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  average_visit_frequency: number;
  average_lifetime_value: number;
  visit_frequency: VisitFrequency[];
  customer_segments: CustomerSegment[];
  top_customers: TopCustomer[];
  visit_trends: VisitTrend[];
}

export interface VisitFrequency {
  range: string;
  count: number;
  percentage: number;
}

export interface CustomerSegment {
  segment: string;
  count: number;
  percentage: number;
  average_spend: number;
}

export interface TopCustomer {
  id: string;
  name: string;
  email: string;
  total_orders: number;
  total_spent: number;
  last_visit: string | null;
}

export interface VisitTrend {
  date: string;
  new_customers: number;
  returning_customers: number;
  total_visits: number;
}

export interface DrillDownData {
  title: string;
  data: Record<string, unknown>[];
  type: "bar" | "line" | "pie" | "area";
}
