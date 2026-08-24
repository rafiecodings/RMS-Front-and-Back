import { safeArray, safeNumber, safeObject } from "@/lib/utils";
import type { DashboardSummary } from "@/lib/types";

interface RawDashboardSummary extends Record<string, unknown> {
  revenue?: Record<string, unknown>;
  sales?: Record<string, unknown>;
  orders?: Record<string, unknown>;
  tables?: Record<string, unknown>;
  kitchen?: Record<string, unknown>;
  top_selling_items?: unknown;
  peak_hours?: unknown;
  alerts?: unknown;
  inventory_alerts?: unknown;
  recent_orders?: unknown;
  recent_activities?: unknown;
}

export function normalizeDashboardSummary(raw: unknown): DashboardSummary {
  const d = safeObject<RawDashboardSummary>(raw);

  return {
    revenue: {
      today: safeNumber(d.revenue?.today),
      yesterday: safeNumber(d.revenue?.yesterday),
      this_week: safeNumber(d.revenue?.this_week),
      this_month: safeNumber(d.revenue?.this_month),
      comparison_percentage: safeNumber(d.revenue?.comparison_percentage),
      daily_breakdown: safeArray(d.revenue?.daily_breakdown),
    },
    sales: {
      total_today: safeNumber(d.sales?.total_today),
      transaction_count: safeNumber(d.sales?.transaction_count),
      average_ticket: safeNumber(d.sales?.average_ticket),
      by_type: safeArray(d.sales?.by_type),
      by_payment: safeArray(d.sales?.by_payment),
    },
    orders: {
      total_today: safeNumber(d.orders?.total_today),
      active: safeNumber(d.orders?.active),
      completed: safeNumber(d.orders?.completed),
      cancelled: safeNumber(d.orders?.cancelled),
      average_preparation_time: safeNumber(d.orders?.average_preparation_time),
      status_breakdown: safeArray(d.orders?.status_breakdown),
    },
    tables: {
      total: safeNumber(d.tables?.total),
      available: safeNumber(d.tables?.available),
      occupied: safeNumber(d.tables?.occupied),
      reserved: safeNumber(d.tables?.reserved),
      needs_cleaning: safeNumber(d.tables?.needs_cleaning),
      maintenance: safeNumber(d.tables?.maintenance),
      occupancy_rate: safeNumber(d.tables?.occupancy_rate),
    },
    kitchen: {
      queue_length: safeNumber(d.kitchen?.queue_length),
      avg_wait_time: safeNumber(d.kitchen?.avg_wait_time),
      orders_in_progress: safeArray(d.kitchen?.orders_in_progress),
    },
    top_selling_items: safeArray(d.top_selling_items),
    peak_hours: safeArray(d.peak_hours),
    alerts: safeArray(d.alerts),
    inventory_alerts: safeArray(d.inventory_alerts),
    recent_orders: safeArray(d.recent_orders),
    recent_activities: safeArray(d.recent_activities),
  };
}
