import { describe, expect, it } from "vitest";
import { normalizeRevenueReport, normalizeCustomerReport, normalizeSalesReport, normalizeStaffReport, normalizeInventoryReport, normalizeTaxReport } from "./normalizers";

describe("operational report contracts", () => {
  it("uses the backend net revenue and avg_order_value, including an explicit zero", () => {
    const report = normalizeRevenueReport({ summary: { gross_revenue: "224", refunds: "20", net_revenue: "204", total_orders: "2", avg_order_value: "102" }, daily: [{ date: "2026-09-10", revenue: "204", orders: "2" }] });
    expect(report).toMatchObject({ gross_revenue: 224, refunds: 20, total_revenue: 204, net_revenue: 204, average_order_value: 102, total_orders: 2, revenue_growth: null });
    expect(report.daily_revenue[0].revenue).toBe(204);
    expect(normalizeRevenueReport({ summary: { net_revenue: 100, total_orders: 2, avg_order_value: 0 } }).average_order_value).toBe(0);
  });
  it("unwraps the customer summary and preserves server tiers and visits", () => {
    expect(normalizeCustomerReport({ summary: { total_customers: "5", new_in_period: "2", loyal_customers: "4", loyalty_tiers: { Gold: "1" }, avg_total_spent: "500", avg_visit_count: "12" }, top_customers: [{ id: "a", name: "Ada", visit_count: "20", total_spent: "2000", loyalty_tier: "Gold", loyalty_points: "7" }] }))
      .toMatchObject({ total_customers: 5, new_in_period: 2, loyal_customers: 4, loyalty_tiers: { Gold: 1, Member: 0 }, top_customers: [{ visit_count: 20, total_spent: 2000, loyalty_tier: "Gold" }] });
  });
  it("handles empty reports without invented growth or NaN", () => {
    expect(normalizeRevenueReport(null)).toMatchObject({ gross_revenue: 0, net_revenue: 0, average_order_value: 0, daily_revenue: [], revenue_growth: null });
    expect(normalizeCustomerReport(null)).toMatchObject({ total_customers: 0, top_customers: [], loyalty_tiers: { Platinum: 0 } });
  });
  it("maps sales, staff, inventory and tax response fields", () => {
    expect(normalizeSalesReport({ items_sold: 2, by_order_type: [{ type: "takeaway", revenue: "112", orders: 1 }] })).toMatchObject({ total_sales: 112, total_items_sold: 2 });
    expect(normalizeStaffReport({ total_staff: 1, active_staff: 1, attendance_summary: { attendance_rate: 100 }, performance_ranking: [{ staff_id: "s", orders_handled: 1, revenue_generated: 112 }] })).toMatchObject({ total_staff: 1, performance_ranking: [{ id: "s", orders_handled: 1, revenue_generated: 112 }] });
    expect(normalizeInventoryReport({ summary: { wastage_cost: 100 }, low_stock_items: [{ unit_cost: 50 }] })).toMatchObject({ wastage_summary: { total_wastage_cost: 100 }, low_stock_items: [{ unit_cost: 50 }] });
    expect(normalizeTaxReport({ summary: { total_tax_collected: 12, note: "Stored tax" }, daily: [{ date: "2026-09-10", tax_collected: 12 }] })).toMatchObject({ total_tax_collected: 12, note: "Stored tax", monthly_tax: [{ month: "2026-09", tax_collected: 12 }] });
  });
});
