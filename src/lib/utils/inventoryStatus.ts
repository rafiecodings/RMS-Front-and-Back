export type StockStatus = "healthy" | "low" | "out" | "over";

/**
 * Canonical stock-status machine (mirrored by backend reports):
 *   stock <= 0                      -> Out of Stock
 *   stock > 0 && stock <= minimum   -> Low Stock
 *   stock > maximum (> 0)           -> Overstock
 *   otherwise                       -> Healthy
 */
export function getStockStatus(
  stock: number,
  minimum: number,
  maximum: number | null | undefined
): StockStatus {
  if (stock <= 0) return "out";
  if (minimum > 0 && stock <= minimum) return "low";
  if (maximum != null && maximum > 0 && stock > maximum) return "over";
  return "healthy";
}

export const STOCK_STATUS_BADGE: Record<StockStatus, string> = {
  healthy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  low: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  out: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  over: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
};

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  healthy: "Healthy",
  low: "Low Stock",
  out: "Out of Stock",
  over: "Overstock",
};
