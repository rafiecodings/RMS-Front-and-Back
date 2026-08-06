import { safeArray, safeNumber, safeObject, safeString } from "@/lib/utils";
import type { OrderType } from "@/lib/types";
import type {
  RevenueReport,
  SalesReport,
  DailyRevenueData,
  RevenueByType,
  RevenueByPayment,
  SalesByCategory,
  TopSalesItem,
  MenuPerformanceReport,
  MenuItemPerformance,
  CategoryPerformance,
  ModifierUsage,
  InventoryReport,
  StockValuation,
  ConsumptionVariance,
  WastageSummary,
  TopSupplier,
  StaffReport,
  AttendanceSummary,
  StaffPerformanceRanking,
  ShiftCoverage,
  ClockSummary,
  TaxReport,
  TaxBreakdown,
  MonthlyTax,
  TaxByOrderType,
} from "./types";

interface RawRevenueReport extends Record<string, unknown> {
  period?: unknown;
  summary?: Record<string, unknown>;
  daily?: Array<{ date?: unknown; revenue?: unknown; orders?: unknown }>;
}

export function normalizeRevenueReport(raw: unknown): RevenueReport {
  const r = safeObject<RawRevenueReport>(raw);
  const summary = safeObject(r.summary);
  const daily = safeArray<{ date?: unknown; revenue?: unknown; orders?: unknown }>(r.daily);
  const totalRevenue = safeNumber(summary.total_revenue);
  const totalOrders = safeNumber(summary.total_orders);
  const aov = safeNumber(summary.avg_order_value);

  return {
    total_revenue: totalRevenue,
    total_orders: totalOrders,
    average_order_value: aov > 0 ? aov : totalOrders > 0 ? totalRevenue / totalOrders : 0,
    revenue_growth: 0,
    daily_revenue: daily.map(
      (d): DailyRevenueData => ({
        date: safeString(d.date),
        revenue: safeNumber(d.revenue),
        orders: safeNumber(d.orders),
      }),
    ),
    revenue_by_type: [],
    revenue_by_payment: [],
  };
}

interface RawSalesReport extends Record<string, unknown> {
  period?: unknown;
  by_order_type?: Array<{ type?: unknown; revenue?: unknown; orders?: unknown }>;
  by_payment_method?: Array<{ method?: unknown; revenue?: unknown; orders?: unknown }>;
  hourly_distribution?: unknown;
}

export function normalizeSalesReport(raw: unknown): SalesReport {
  const r = safeObject<RawSalesReport>(raw);
  const byType = safeArray<{ type?: unknown; revenue?: unknown; orders?: unknown }>(r.by_order_type);
  const totalSales = byType.reduce((sum, x) => sum + safeNumber(x.revenue), 0);
  const totalOrders = byType.reduce((sum, x) => sum + safeNumber(x.orders), 0);
  const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

  return {
    total_sales: totalSales,
    total_items_sold: 0,
    average_ticket: averageTicket,
    sales_growth: 0,
    sales_by_day: [],
    sales_by_category: [],
    revenue_by_type: byType.map(
      (x): RevenueByType => ({
        order_type: safeString(x.type) as OrderType,
        revenue: safeNumber(x.revenue),
        percentage: totalSales > 0 ? (safeNumber(x.revenue) / totalSales) * 100 : 0,
      }),
    ),
    top_items: [],
    bottom_items: [],
  };
}

interface RawMenuPerformanceReport extends Record<string, unknown> {
  period?: unknown;
  top_items?: Array<{
    menu_item_id?: unknown;
    name?: unknown;
    total_quantity?: unknown;
    total_revenue?: unknown;
  }>;
}

export function normalizeMenuPerformanceReport(raw: unknown): MenuPerformanceReport {
  const r = safeObject<RawMenuPerformanceReport>(raw);
  const items = safeArray<{
    menu_item_id?: unknown;
    name?: unknown;
    total_quantity?: unknown;
    total_revenue?: unknown;
  }>(r.top_items);

  return {
    total_menu_items: 0,
    active_items: 0,
    average_margin: 0,
    item_performance: items.map(
      (it): MenuItemPerformance => ({
        id: safeString(it.menu_item_id),
        name: safeString(it.name),
        category: "",
        quantity_sold: safeNumber(it.total_quantity),
        revenue: safeNumber(it.total_revenue),
        cost: 0,
        margin: 0,
        margin_percentage: 0,
        popularity_score: 0,
      }),
    ),
    category_performance: [],
    modifier_usage: [],
  };
}

interface RawInventoryReport extends Record<string, unknown> {
  period?: unknown;
  summary?: Record<string, unknown>;
  low_stock_items?: unknown;
}

export function normalizeInventoryReport(raw: unknown): InventoryReport {
  const r = safeObject<RawInventoryReport>(raw);
  const summary = safeObject(r.summary);

  return {
    total_ingredients: safeNumber(summary.total_ingredients),
    total_stock_value: safeNumber(summary.total_stock_value),
    low_stock_count: safeNumber(summary.low_stock_count),
    stock_valuation: [],
    consumption_variance: [],
    wastage_summary: {
      total_wastage_count: 0,
      total_wastage_cost: 0,
      by_reason: [],
    },
    top_suppliers: [],
  };
}

interface RawStaffReport extends Record<string, unknown> {
  period?: unknown;
  staff_performance?: Array<{
    staff_id?: unknown;
    name?: unknown;
    position?: unknown;
    total_orders?: unknown;
    total_sales?: unknown;
    avg_rating?: unknown;
  }>;
}

export function normalizeStaffReport(raw: unknown): StaffReport {
  const r = safeObject<RawStaffReport>(raw);
  const perf = safeArray<{
    staff_id?: unknown;
    name?: unknown;
    position?: unknown;
    total_orders?: unknown;
    total_sales?: unknown;
    avg_rating?: unknown;
  }>(r.staff_performance);

  const performance_ranking: StaffPerformanceRanking[] = perf.map(
    (p): StaffPerformanceRanking => ({
      id: safeString(p.staff_id),
      name: safeString(p.name),
      role: safeString(p.position),
      orders_handled: safeNumber(p.total_orders),
      revenue_generated: safeNumber(p.total_sales),
      average_rating: safeNumber(p.avg_rating),
      attendance_rate: 0,
      performance_score: 0,
    }),
  );

  return {
    total_staff: perf.length,
    active_staff: perf.length,
    total_labor_cost: 0,
    labor_cost_percentage: 0,
    attendance_summary: {
      total_records: 0,
      present: 0,
      absent: 0,
      late: 0,
      on_leave: 0,
      attendance_rate: 0,
    } as AttendanceSummary,
    performance_ranking,
    shift_coverage: [],
    clock_summary: {
      average_hours_per_day: 0,
      overtime_hours: 0,
      total_worked_hours: 0,
    } as ClockSummary,
  };
}

interface RawTaxReport extends Record<string, unknown> {
  period?: unknown;
  summary?: Record<string, unknown>;
  daily?: Array<{ date?: unknown; tax_collected?: unknown }>;
}

export function normalizeTaxReport(raw: unknown): TaxReport {
  const r = safeObject<RawTaxReport>(raw);
  const summary = safeObject(r.summary);
  const daily = safeArray<{ date?: unknown; tax_collected?: unknown }>(r.daily);

  const monthlyMap = new Map<string, number>();
  daily.forEach((d) => {
    const date = safeString(d.date);
    const month = date.slice(0, 7); // YYYY-MM
    if (month) {
      monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + safeNumber(d.tax_collected));
    }
  });

  return {
    total_tax_collected: safeNumber(summary.total_tax_collected),
    tax_breakdown: [],
    monthly_tax: Array.from(monthlyMap.entries()).map(
      ([month, tax_collected]): MonthlyTax => ({
        month,
        tax_collected,
        taxable_sales: 0,
      }),
    ),
    tax_by_order_type: [],
  };
}
