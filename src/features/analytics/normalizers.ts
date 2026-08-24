import { safeArray, safeDate, safeNumber, safeObject, safeString } from "@/lib/utils";
import type { OrderType } from "@/lib/types";
import type {
  RevenueAnalytics,
  RevenueByDay,
  RevenueByHour,
  RevenueByType,
  RevenueTrend,
  SalesTrends,
  SalesByHour,
  SalesByCategoryTrend,
  SalesByDay,
  BestSellingItem,
  PeakHours,
  PeakHourData,
  HourlyDistribution,
  InventoryUsage,
  UsageByCategory,
  ConsumedIngredient,
  WastageTrend,
  LowStockAlert,
  CustomerAnalytics,
  VisitFrequency,
  CustomerSegment,
  TopCustomer,
  VisitTrend,
  DemandForecast,
  ForecastPrediction,
  ForecastHorizon,
  LowStockProjection,
  StockoutProjectionItem,
  StockoutContributor,
  StockoutSeverity,
} from "./types";

interface RawDaily {
  date?: unknown;
  hour?: unknown;
  day_of_week?: unknown;
  revenue?: unknown;
  orders?: unknown;
  items_sold?: unknown;
  previous_period_revenue?: unknown;
}

export function normalizeRevenueAnalytics(raw: unknown): RevenueAnalytics {
  const r = safeObject<{
    total_revenue?: unknown;
    revenue_growth?: unknown;
    average_order_value?: unknown;
    revenue_by_day?: unknown;
    revenue_by_hour?: unknown;
    revenue_by_type?: unknown;
    revenue_trend?: unknown;
  }>(raw);

  const byDay = safeArray<RawDaily>(r.revenue_by_day);
  const totalRevenue = safeNumber(r.total_revenue);
  const totalOrders = byDay.reduce((sum, d) => sum + safeNumber(d.orders), 0);

  return {
    total_revenue: totalRevenue,
    revenue_growth:
      r.revenue_growth === null || r.revenue_growth === undefined
        ? null
        : safeNumber(r.revenue_growth),
    average_order_value:
      totalOrders > 0 ? totalRevenue / totalOrders : safeNumber(r.average_order_value),
    revenue_by_hour: safeArray<RawDaily>(r.revenue_by_hour).map(
      (d): RevenueByHour => ({
        hour: safeNumber(d.hour ?? d.date),
        revenue: safeNumber(d.revenue),
        orders: safeNumber(d.orders),
      }),
    ),
    revenue_by_day: byDay.map(
      (d): RevenueByDay => ({
        date: safeString(d.date),
        revenue: safeNumber(d.revenue),
        orders: safeNumber(d.orders),
      }),
    ),
    revenue_by_type: safeArray<{ type?: unknown; revenue?: unknown; orders?: unknown }>(
      r.revenue_by_type,
    ).map(
      (x): RevenueByType => ({
        order_type: safeString(x.type) as OrderType,
        revenue: safeNumber(x.revenue),
        percentage: totalRevenue > 0 ? (safeNumber(x.revenue) / totalRevenue) * 100 : 0,
      }),
    ),
    revenue_trend: safeArray<{
      date?: unknown;
      revenue?: unknown;
      previous_period_revenue?: unknown;
    }>(r.revenue_trend).map(
      (d): RevenueTrend => ({
        date: safeString(d.date),
        revenue: safeNumber(d.revenue),
        previous_period_revenue: safeNumber(d.previous_period_revenue),
      }),
    ),
  };
}

export function normalizeSalesAnalytics(raw: unknown): SalesTrends {
  const r = safeObject<{
    total_sales?: unknown;
    sales_growth?: unknown;
    total_items_sold?: unknown;
    average_ticket?: unknown;
    sales_by_hour?: unknown;
    sales_by_category?: unknown;
    sales_by_day?: unknown;
    top_items?: unknown;
  }>(raw);
  return {
    total_sales: safeNumber(r.total_sales),
    sales_growth:
      r.sales_growth === null || r.sales_growth === undefined
        ? null
        : safeNumber(r.sales_growth),
    total_items_sold: safeNumber(r.total_items_sold),
    average_ticket: safeNumber(r.average_ticket),
    sales_by_hour: safeArray<{ hour?: unknown; items_sold?: unknown; revenue?: unknown }>(
      r.sales_by_hour,
    ).map(
      (d): SalesByHour => ({
        hour: safeNumber(d.hour),
        items_sold: safeNumber(d.items_sold),
        revenue: safeNumber(d.revenue),
      }),
    ),
    sales_by_category: safeArray<{ category?: unknown; items_sold?: unknown; revenue?: unknown; percentage?: unknown }>(
      r.sales_by_category,
    ).map(
      (d): SalesByCategoryTrend => ({
        category: safeString(d.category),
        items_sold: safeNumber(d.items_sold),
        revenue: safeNumber(d.revenue),
        percentage: safeNumber(d.percentage),
      }),
    ),
    sales_by_day: safeArray<RawDaily>(r.sales_by_day).map(
      (d): SalesByDay => ({
        date: safeString(d.date),
        items_sold: safeNumber(d.items_sold),
        revenue: safeNumber(d.revenue),
      }),
    ),
    top_items: safeArray<{
      id?: unknown;
      name?: unknown;
      category?: unknown;
      quantity_sold?: unknown;
      revenue?: unknown;
      average_price?: unknown;
      forecast_daily_demand?: unknown;
      trend?: unknown;
    }>(r.top_items).map(
      (d): BestSellingItem => ({
        id: safeString(d.id),
        name: safeString(d.name),
        category: safeString(d.category),
        quantity_sold: safeNumber(d.quantity_sold),
        revenue: safeNumber(d.revenue),
        average_price: safeNumber(d.average_price),
        forecast_daily_demand: safeNumber(d.forecast_daily_demand),
        trend: normalizeDemandTrend(d.trend),
      }),
    ),
  };
}

export function normalizeDemandTrend(value: unknown): BestSellingItem["trend"] {
  const trend = safeString(value);
  return trend === "rising" || trend === "falling" ? trend : "stable";
}

export function normalizePeakHours(raw: unknown): PeakHours {
  const r = safeObject<{
    peak_hours?: unknown;
    hourly_distribution?: unknown;
  }>(raw);
  const byHour = safeArray<{ hour?: unknown; day_of_week?: unknown; orders?: unknown; revenue?: unknown }>(
    r.peak_hours,
  );
  const peak = byHour.reduce(
    (max, d) => (safeNumber(d.orders) > safeNumber(max?.orders) ? d : max),
    byHour[0] ?? null,
  );
  return {
    peak_hours: byHour.map(
      (d): PeakHourData => ({
        hour: safeNumber(d.hour),
        day_of_week: safeString(d.day_of_week) || "today",
        orders: safeNumber(d.orders),
        revenue: safeNumber(d.revenue),
      }),
    ),
    busiest_day: peak ? safeString(peak.day_of_week) || "today" : "today",
    quietest_day: "today",
    average_orders_per_hour:
      byHour.length > 0
        ? byHour.reduce((sum, d) => sum + safeNumber(d.orders), 0) / byHour.length
        : 0,
    hourly_distribution: safeArray<{
      hour?: unknown;
      label?: unknown;
      monday?: unknown;
      tuesday?: unknown;
      wednesday?: unknown;
      thursday?: unknown;
      friday?: unknown;
      saturday?: unknown;
      sunday?: unknown;
      average?: unknown;
    }>(r.hourly_distribution).map(
      (d): HourlyDistribution => ({
        hour: safeNumber(d.hour),
        label: safeString(d.label),
        monday: safeNumber(d.monday),
        tuesday: safeNumber(d.tuesday),
        wednesday: safeNumber(d.wednesday),
        thursday: safeNumber(d.thursday),
        friday: safeNumber(d.friday),
        saturday: safeNumber(d.saturday),
        sunday: safeNumber(d.sunday),
        average: safeNumber(d.average),
      }),
    ),
  };
}

export function normalizeInventoryUsage(raw: unknown): InventoryUsage {
  const r = safeObject<{
    total_ingredients?: unknown;
    total_usage_cost?: unknown;
    wastage_cost?: unknown;
    usage_by_category?: unknown;
    top_consumed?: unknown;
    wastage_trend?: unknown;
    low_stock_alerts?: unknown;
  }>(raw);
  return {
    total_ingredients: safeNumber(r.total_ingredients),
    total_usage_cost: safeNumber(r.total_usage_cost),
    wastage_cost: safeNumber(r.wastage_cost),
    usage_by_category: safeArray<{ category?: unknown; usage_cost?: unknown; percentage?: unknown }>(
      r.usage_by_category,
    ).map(
      (d): UsageByCategory => ({
        category: safeString(d.category),
        usage_cost: safeNumber(d.usage_cost),
        percentage: safeNumber(d.percentage),
      }),
    ),
    top_consumed: safeArray<{
      id?: unknown;
      name?: unknown;
      category?: unknown;
      quantity_used?: unknown;
      unit?: unknown;
      cost?: unknown;
    }>(r.top_consumed).map(
      (d): ConsumedIngredient => ({
        id: safeString(d.id),
        name: safeString(d.name),
        category: safeString(d.category),
        quantity_used: safeNumber(d.quantity_used),
        unit: safeString(d.unit),
        cost: safeNumber(d.cost),
      }),
    ),
    wastage_trend: safeArray<{ date?: unknown; wastage_count?: unknown; wastage_cost?: unknown }>(
      r.wastage_trend,
    ).map(
      (d): WastageTrend => ({
        date: safeString(d.date),
        wastage_count: safeNumber(d.wastage_count),
        wastage_cost: safeNumber(d.wastage_cost),
      }),
    ),
    low_stock_alerts: safeArray<{
      id?: unknown;
      name?: unknown;
      current_stock?: unknown;
      min_threshold?: unknown;
      unit?: unknown;
      severity?: unknown;
    }>(r.low_stock_alerts).map(
      (d): LowStockAlert => ({
        id: safeString(d.id),
        name: safeString(d.name),
        current_stock: safeNumber(d.current_stock),
        min_threshold: safeNumber(d.min_threshold),
        unit: safeString(d.unit),
        severity: (safeString(d.severity) as LowStockAlert["severity"]) || "low",
      }),
    ),
  };
}

export function normalizeCustomerAnalytics(raw: unknown): CustomerAnalytics {
  const r = safeObject<{
    total_customers?: unknown;
    new_customers?: unknown;
    returning_customers?: unknown;
    average_visit_frequency?: unknown;
    average_lifetime_value?: unknown;
    visit_frequency?: unknown;
    customer_segments?: unknown;
    top_customers?: unknown;
    visit_trends?: unknown;
  }>(raw);
  const totalCustomers = safeNumber(r.total_customers);
  return {
    total_customers: totalCustomers,
    new_customers: safeNumber(r.new_customers),
    returning_customers: safeNumber(r.returning_customers),
    average_visit_frequency: safeNumber(r.average_visit_frequency),
    average_lifetime_value: safeNumber(r.average_lifetime_value),
    visit_frequency: safeArray<{ range?: unknown; count?: unknown; percentage?: unknown }>(
      r.visit_frequency,
    ).map(
      (d): VisitFrequency => ({
        range: safeString(d.range),
        count: safeNumber(d.count),
        percentage: safeNumber(d.percentage),
      }),
    ),
    customer_segments: safeArray<{
      segment?: unknown;
      count?: unknown;
      percentage?: unknown;
      average_spend?: unknown;
    }>(r.customer_segments).map(
      (d): CustomerSegment => ({
        segment: safeString(d.segment),
        count: safeNumber(d.count),
        percentage: safeNumber(d.percentage),
        average_spend: safeNumber(d.average_spend),
      }),
    ),
    top_customers: safeArray<{
      id?: unknown;
      name?: unknown;
      email?: unknown;
      total_orders?: unknown;
      total_spent?: unknown;
      last_visit?: unknown;
    }>(r.top_customers).map(
      (d): TopCustomer => ({
        id: safeString(d.id),
        name: safeString(d.name),
        email: safeString(d.email),
        total_orders: safeNumber(d.total_orders),
        total_spent: safeNumber(d.total_spent),
        last_visit: safeDate(d.last_visit),
      }),
    ),
    visit_trends: safeArray<{
      date?: unknown;
      new_customers?: unknown;
      returning_customers?: unknown;
      total_visits?: unknown;
    }>(r.visit_trends).map(
      (d): VisitTrend => ({
        date: safeString(d.date),
        new_customers: safeNumber(d.new_customers),
        returning_customers: safeNumber(d.returning_customers),
        total_visits: safeNumber(d.total_visits),
      }),
    ),
  };
}

export function normalizeForecast(raw: unknown): DemandForecast {
  const r = safeObject<{
    item_id?: unknown;
    horizon?: unknown;
    model?: unknown;
    fallback?: unknown;
    predictions?: unknown;
  }>(raw);

  const predictions = safeArray<{
    date?: unknown;
    qty?: unknown;
    lower_ci?: unknown;
    upper_ci?: unknown;
  }>(r.predictions).map(
    (p): ForecastPrediction => ({
      date: safeString(p.date),
      qty: safeNumber(p.qty),
      lower_ci: safeNumber(p.lower_ci),
      upper_ci: safeNumber(p.upper_ci),
    }),
  );

  const rawHorizon = safeNumber(r.horizon);
  const horizon = (
    rawHorizon === 7 || rawHorizon === 14 || rawHorizon === 30 ? rawHorizon : 7
  ) as ForecastHorizon;

  return {
    item_id: safeString(r.item_id),
    horizon,
    model: safeString(r.model) || "naive",
    fallback: Boolean(r.fallback),
    predictions,
  };
}

export function normalizeLowStockProjection(raw: unknown): LowStockProjection {
  const r = safeObject<{
    generated_at?: unknown;
    horizon_days?: unknown;
    items?: unknown;
    summary?: unknown;
  }>(raw);

  const items = safeArray<{
    id?: unknown;
    name?: unknown;
    category?: unknown;
    unit?: unknown;
    current_stock?: unknown;
    minimum_stock?: unknown;
    forecast_daily_usage?: unknown;
    days_until_stockout?: unknown;
    severity?: unknown;
    contributors?: unknown;
  }>(r.items).map(
    (d): StockoutProjectionItem => ({
      id: safeString(d.id),
      name: safeString(d.name),
      category: safeString(d.category) || null,
      unit: safeString(d.unit),
      current_stock: safeNumber(d.current_stock),
      minimum_stock: safeNumber(d.minimum_stock),
      forecast_daily_usage: safeNumber(d.forecast_daily_usage),
      days_until_stockout:
        d.days_until_stockout === null || d.days_until_stockout === undefined
          ? null
          : safeNumber(d.days_until_stockout),
      severity: normalizeStockoutSeverity(d.severity),
      contributors: safeArray<{
        menu_item_id?: unknown;
        name?: unknown;
        forecast_daily_demand?: unknown;
      }>(d.contributors).map(
        (c): StockoutContributor => ({
          menu_item_id: safeString(c.menu_item_id),
          name: safeString(c.name),
          forecast_daily_demand: safeNumber(c.forecast_daily_demand),
        }),
      ),
    }),
  );

  const rawHorizon = safeNumber(r.horizon_days);
  const horizon = (
    rawHorizon === 7 || rawHorizon === 14 || rawHorizon === 30 ? rawHorizon : 7
  ) as ForecastHorizon;

  const summary = safeObject<Record<string, unknown>>(r.summary);
  const toCount = (key: string): number =>
    typeof summary[key] === "number" ? (summary[key] as number) : 0;

  return {
    generated_at: safeString(r.generated_at),
    horizon_days: horizon,
    items,
    summary: {
      out_of_stock: toCount("out_of_stock"),
      critical: toCount("critical"),
      high: toCount("high"),
      medium: toCount("medium"),
      low: toCount("low"),
    },
  };
}

function normalizeStockoutSeverity(value: unknown): StockoutSeverity {
  const severity = safeString(value);
  return (
    severity === "out_of_stock" ||
    severity === "critical" ||
    severity === "high" ||
    severity === "medium" ||
    severity === "low"
      ? severity
      : "low"
  );
}