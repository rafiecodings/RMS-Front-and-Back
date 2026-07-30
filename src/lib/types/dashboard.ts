export interface DashboardSummary {
  revenue: RevenueSummary;
  sales: SalesSummary;
  orders: OrderSummary;
  tables: TableSummary;
  kitchen: KitchenSummary;
  top_selling_items: TopSellingItem[];
  peak_hours: PeakHour[];
  alerts: DashboardAlert[];
  inventory_alerts: InventoryAlert[];
  recent_orders: RecentOrder[];
  recent_activities: ActivityItem[];
}

export interface RevenueSummary {
  today: number;
  yesterday: number;
  this_week: number;
  this_month: number;
  comparison_percentage: number;
  daily_breakdown: DailyRevenue[];
}

export interface DailyRevenue {
  date: string;
  amount: number;
}

export interface SalesSummary {
  total_today: number;
  transaction_count: number;
  average_ticket: number;
  by_type: { order_type: string; count: number; revenue: number }[];
  by_payment: { method: string; count: number; revenue: number }[];
}

export interface OrderSummary {
  total_today: number;
  active: number;
  completed: number;
  cancelled: number;
  average_preparation_time: number;
  status_breakdown: { status: string; count: number }[];
}

export interface TableSummary {
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  needs_cleaning: number;
  maintenance: number;
  occupancy_rate: number;
}

export interface KitchenSummary {
  queue_length: number;
  avg_wait_time: number;
  orders_in_progress: KitchenOrder[];
}

export interface KitchenOrder {
  id: string;
  order_number: string;
  table_number: string | null;
  order_type: "dine_in" | "takeaway" | "delivery";
  items: { name: string; quantity: number; notes?: string }[];
  status: "received" | "in_progress" | "ready";
  elapsed_minutes: number;
  priority: "normal" | "rush";
}

export interface TopSellingItem {
  id: string;
  name: string;
  quantity_sold: number;
  revenue: number;
  category: string;
}

export interface PeakHour {
  hour: number;
  orders: number;
  revenue: number;
}

export interface DashboardAlert {
  id: string;
  type: "low_inventory" | "reservation" | "order" | "staff";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  created_at: string;
}

export interface InventoryAlert {
  id: string;
  ingredient_name: string;
  current_stock: number;
  min_threshold: number;
  unit: string;
  severity: "low" | "critical" | "out_of_stock";
  supplier?: string;
}

export interface RecentOrder {
  id: string;
  order_number: string;
  customer_name: string | null;
  table_number: string | null;
  order_type: "dine_in" | "takeaway" | "delivery";
  status: "placed" | "confirmed" | "preparing" | "ready" | "served" | "completed" | "cancelled";
  total: number;
  items_count: number;
  created_at: string;
}

export interface ActivityItem {
  id: string;
  type: "order_placed" | "order_completed" | "order_cancelled" | "table_reserved" | "table_freed" | "inventory_low" | "staff_clock_in" | "staff_clock_out";
  message: string;
  details?: string;
  created_at: string;
}
