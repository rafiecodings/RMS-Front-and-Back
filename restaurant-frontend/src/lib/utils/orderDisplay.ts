import type { Order } from "@/lib/types";

/**
 * Resolve a human-readable customer label for an order. Never returns the raw
 * UUID — falls back to "Walk-in / Guest" when no named customer is attached.
 */
export function customerDisplayName(order?: Order | null): string {
  if (!order) return "Walk-in / Guest";
  const name = order.customer?.name ?? order.customer_name;
  return name && String(name).trim() ? String(name).trim() : "Walk-in / Guest";
}

/**
 * Resolve a human-readable table label for an order. Returns "" when the order
 * has no table (e.g. takeaway). Never returns the raw table UUID.
 */
export function tableDisplayName(order?: Order | null): string {
  if (!order) return "";
  const num = order.table?.number ?? order.table_number;
  return num != null && String(num).trim() !== "" ? `Table ${num}` : "";
}
