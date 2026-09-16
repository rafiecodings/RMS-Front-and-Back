import { safeArray, safeNumber, safeObject, safeString } from "@/lib/utils";
import type { OrderType } from "@/lib/types";
import type {
  RevenueReport,
  SalesReport,
  DailyRevenueData,
  RevenueByType,
  MenuPerformanceReport,
  MenuItemPerformance,
  InventoryReport,
  StaffReport,
  TaxReport,
  MonthlyTax,
  CustomerAnalyticsReport,
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
  const grossRevenue = safeNumber(summary.gross_revenue ?? summary.total_revenue);
  const refunds = safeNumber(summary.refunds);
  const netRevenue = safeNumber(summary.net_revenue ?? summary.total_revenue);
  const totalOrders = safeNumber(summary.total_orders);
  const avgOrderValue = summary.avg_order_value;

  // Backend returns null when there is no comparable previous period.
  const growthRaw = summary.revenue_growth;
  const growth =
    growthRaw === null || growthRaw === undefined || growthRaw === ""
      ? null
      : safeNumber(growthRaw);

  return {
    gross_revenue: grossRevenue,
    refunds,
    net_revenue: netRevenue,
    total_revenue: netRevenue,
    total_orders: totalOrders,
    average_order_value: avgOrderValue != null ? safeNumber(avgOrderValue) : totalOrders > 0 ? netRevenue / totalOrders : 0,
    revenue_growth: growth,
    daily_revenue: daily.map(
      (d): DailyRevenueData => ({
        date: safeString(d.date),
        revenue: safeNumber(d.revenue),
        orders: safeNumber(d.orders),
      }),
    ),
  };
}

export function normalizeCustomerReport(raw: unknown): CustomerAnalyticsReport {
  const report = safeObject(raw);
  const summary = safeObject(report.summary);
  const tiers = safeObject(summary.loyalty_tiers);
  return {
    total_customers: safeNumber(summary.total_customers),
    new_in_period: safeNumber(summary.new_in_period),
    new_this_month: safeNumber(summary.new_this_month),
    loyal_customers: safeNumber(summary.loyal_customers),
    loyalty_tiers: {
      Member: safeNumber(tiers.Member), Bronze: safeNumber(tiers.Bronze),
      Silver: safeNumber(tiers.Silver), Gold: safeNumber(tiers.Gold), Platinum: safeNumber(tiers.Platinum),
    },
    avg_total_spent: safeNumber(summary.avg_total_spent),
    avg_visit_count: safeNumber(summary.avg_visit_count),
    top_customers: safeArray<Record<string, unknown>>(report.top_customers).map((c) => ({
      id: safeString(c.id), name: safeString(c.name), total_spent: safeNumber(c.total_spent),
      visit_count: safeNumber(c.visit_count), loyalty_tier: safeString(c.loyalty_tier) || "Member",
      loyalty_points: safeNumber(c.loyalty_points),
    })),
  };
}

interface RawSalesReport extends Record<string, unknown> {
  period?: unknown;
  items_sold?: unknown;
  sales_growth?: unknown;
  by_order_type?: Array<{ type?: unknown; revenue?: unknown; orders?: unknown }>;
  by_payment_method?: Array<{ method?: unknown; revenue?: unknown; orders?: unknown }>;
  hourly_distribution?: Array<{ hour?: unknown; orders?: unknown; revenue?: unknown }>;
}

export function normalizeSalesReport(raw: unknown): SalesReport {
  const r = safeObject<RawSalesReport>(raw);
  const byType = safeArray<{ type?: unknown; revenue?: unknown; orders?: unknown }>(r.by_order_type);
  const byPayment = safeArray<{ method?: unknown; revenue?: unknown; orders?: unknown }>(
    r.by_payment_method,
  );
  const hourly = safeArray<{ hour?: unknown; orders?: unknown; revenue?: unknown }>(
    r.hourly_distribution,
  );

  const totalSales = byType.reduce((sum, x) => sum + safeNumber(x.revenue), 0);
  const totalOrders = byType.reduce((sum, x) => sum + safeNumber(x.orders), 0);
  const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

  const growthRaw = r.sales_growth;
  const growth =
    growthRaw === null || growthRaw === undefined || growthRaw === ""
      ? null
      : safeNumber(growthRaw);

  return {
    total_sales: totalSales,
    total_items_sold: safeNumber(r.items_sold),
    average_ticket: averageTicket,
    sales_growth: growth,
    revenue_by_type: byType.map(
      (x): RevenueByType => ({
        order_type: safeString(x.type) as OrderType,
        revenue: safeNumber(x.revenue),
        percentage: totalSales > 0 ? (safeNumber(x.revenue) / totalSales) * 100 : 0,
      }),
    ),
    revenue_by_payment: (() => {
      const paymentTotal = byPayment.reduce((s, x) => s + safeNumber(x.revenue), 0);
      return byPayment.map((x) => ({
        method: safeString(x.method),
        revenue: safeNumber(x.revenue),
        count: safeNumber(x.orders),
        percentage: paymentTotal > 0 ? (safeNumber(x.revenue) / paymentTotal) * 100 : 0,
      }));
    })(),
    hourly_distribution: hourly.map((h) => ({
      hour: safeNumber(h.hour),
      orders: safeNumber(h.orders),
      revenue: safeNumber(h.revenue),
    })),
    sales_by_category: [],
  };
}

interface RawMenuPerformanceReport extends Record<string, unknown> {
  period?: unknown;
  total_menu_items?: unknown;
  active_items?: unknown;
  top_items?: Array<{
    menu_item_id?: unknown;
    name?: unknown;
    category?: unknown;
    total_quantity?: unknown;
    total_revenue?: unknown;
    order_count?: unknown;
  }>;
  bottom_items?: Array<{
    menu_item_id?: unknown;
    name?: unknown;
    category?: unknown;
    total_quantity?: unknown;
    total_revenue?: unknown;
    order_count?: unknown;
  }>;
}

function mapMenuItems(
  items: Array<{
    menu_item_id?: unknown;
    name?: unknown;
    category?: unknown;
    total_quantity?: unknown;
    total_revenue?: unknown;
    order_count?: unknown;
  }>,
): MenuItemPerformance[] {
  return items.map(
    (it): MenuItemPerformance => ({
      id: safeString(it.menu_item_id),
      name: safeString(it.name),
      category: safeString(it.category),
      quantity_sold: safeNumber(it.total_quantity),
      revenue: safeNumber(it.total_revenue),
      order_count: safeNumber(it.order_count),
      cost: null,
      margin: null,
      margin_percentage: null,
    }),
  );
}

export function normalizeMenuPerformanceReport(raw: unknown): MenuPerformanceReport {
  const r = safeObject<RawMenuPerformanceReport>(raw);
  const items = safeArray<{
    menu_item_id?: unknown;
    name?: unknown;
    category?: unknown;
    total_quantity?: unknown;
    total_revenue?: unknown;
    order_count?: unknown;
  }>(r.top_items);
  const bottom = safeArray<{
    menu_item_id?: unknown;
    name?: unknown;
    category?: unknown;
    total_quantity?: unknown;
    total_revenue?: unknown;
    order_count?: unknown;
  }>(r.bottom_items);

  return {
    total_menu_items: safeNumber(r.total_menu_items),
    active_items: safeNumber(r.active_items),
    item_performance: mapMenuItems(items),
    bottom_items: mapMenuItems(bottom),
  };
}

interface RawInventoryReport extends Record<string, unknown> {
  summary?: Record<string, unknown>;
  wastage_by_reason?: Array<{
    reason?: unknown;
    count?: unknown;
    quantity?: unknown;
    cost?: unknown;
  }>;
}

export function normalizeInventoryReport(raw: unknown): InventoryReport {
  const r = safeObject<RawInventoryReport>(raw);
  const summary = safeObject(r.summary);
  const reasons = safeArray<{
    reason?: unknown;
    count?: unknown;
    quantity?: unknown;
    cost?: unknown;
  }>(r.wastage_by_reason);

  return {
    total_ingredients: safeNumber(summary.total_ingredients),
    total_stock_value: safeNumber(summary.total_stock_value),
    low_stock_count: safeNumber(summary.low_stock_count),
    wastage_summary: {
      total_wastage_count: safeNumber(summary.wastage_count),
      total_wastage_cost: safeNumber(summary.wastage_cost),
      by_reason: reasons.map((w) => ({
        reason: safeString(w.reason),
        count: safeNumber(w.count),
        quantity: safeNumber(w.quantity),
        cost: safeNumber(w.cost),
      })),
    },
    low_stock_items: safeArray<{
      id?: unknown;
      name?: unknown;
      current_stock?: unknown;
      minimum_stock?: unknown;
      unit_cost?: unknown;
      unit?: unknown;
    }>(r.low_stock_items).map((i) => ({
      id: safeString(i.id),
      name: safeString(i.name),
      current_stock: safeNumber(i.current_stock),
      minimum_stock: safeNumber(i.minimum_stock),
      unit_cost: safeNumber(i.unit_cost),
      unit: safeString(i.unit),
    })),
  };
}

interface RawStaffReport extends Record<string, unknown> {
  total_staff?: unknown;
  active_staff?: unknown;
  attendance_summary?: Record<string, unknown>;
  performance_ranking?: Array<{
    staff_id?: unknown;
    name?: unknown;
    position?: unknown;
    role?: unknown;
    orders_handled?: unknown;
    revenue_generated?: unknown;
    avg_ticket?: unknown;
    shifts_scheduled?: unknown;
    attendance_rate?: unknown;
  }>;
}

function nullableRate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  return safeNumber(value);
}

export function normalizeStaffReport(raw: unknown): StaffReport {
  const r = safeObject<RawStaffReport>(raw);
  const attSummary = safeObject(r.attendance_summary);
  const ranking = safeArray<{
    staff_id?: unknown;
    name?: unknown;
    position?: unknown;
    role?: unknown;
    orders_handled?: unknown;
    revenue_generated?: unknown;
    avg_ticket?: unknown;
    shifts_scheduled?: unknown;
    attendance_rate?: unknown;
  }>(r.performance_ranking);

  return {
    total_staff: safeNumber(r.total_staff),
    active_staff: safeNumber(r.active_staff),
    attendance_summary: {
      total_records: safeNumber(attSummary.total_records),
      present: safeNumber(attSummary.present),
      absent: safeNumber(attSummary.absent),
      late: safeNumber(attSummary.late),
      on_leave: safeNumber(attSummary.on_leave),
      attendance_rate: nullableRate(attSummary.attendance_rate),
    },
    performance_ranking: ranking.map((p) => ({
      id: safeString(p.staff_id),
      name: safeString(p.name),
      position: safeString(p.position),
      role: safeString(p.role),
      orders_handled: safeNumber(p.orders_handled),
      revenue_generated: safeNumber(p.revenue_generated),
      avg_ticket: safeNumber(p.avg_ticket),
      shifts_scheduled: safeNumber(p.shifts_scheduled),
      attendance_rate: nullableRate(p.attendance_rate),
    })),
  };
}

interface RawTaxReport extends Record<string, unknown> {
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
    note: safeString(summary.note),
    monthly_tax: Array.from(monthlyMap.entries()).map(
      ([month, tax_collected]): MonthlyTax => ({
        month,
        tax_collected,
      }),
    ),
  };
}
