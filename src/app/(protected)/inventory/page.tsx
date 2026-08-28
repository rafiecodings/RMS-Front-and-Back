"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageHeader, LoadingSkeleton } from "@/components/shared";
import { useIngredients, useStockMovements, useReplenishmentRequests } from "@/lib/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { StockMovementTable } from "@/features/inventory";
import {
  getStockStatus,
  STOCK_STATUS_BADGE,
  STOCK_STATUS_LABEL,
} from "@/lib/utils/inventoryStatus";
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowUpCircle,
  DollarSign,
  ClipboardList,
} from "lucide-react";

interface IngredientRow {
  id: string;
  name: string;
  unit?: string | null;
  current_stock: number;
  minimum_stock: number;
  maximum_stock?: number | null;
  cost_per_unit?: number | null;
}

// Evaluated once at module load (pure render); refreshed on page reload.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WEEK_AGO_MS = Date.now() - WEEK_MS;

export default function InventoryPage() {
  const { user } = useAuth();
  const canRequestReplenishment = user?.role === "inventory_staff";
  const { list: ingredientsList } = useIngredients({ per_page: 200 });
  const statsLoading = ingredientsList.isLoading;
  const ingredients = useMemo(
    () => (ingredientsList.data?.data?.data ?? []) as IngredientRow[],
    [ingredientsList.data]
  );

  const movementsList = useStockMovements({ per_page: 200 });
  const movementsLoading = movementsList.isLoading;
  const movements = useMemo(
    () => movementsList.data?.data?.data ?? [],
    [movementsList.data]
  );

  // Pending (non-terminal) replenishment requests for the optional card.
  const pendingReplenishment = useReplenishmentRequests({ per_page: 50 });
  const pendingCount = useMemo(
    () =>
      (pendingReplenishment.list.data?.data?.data ?? []).filter((r) =>
        ["submitted", "approved", "processing"].includes(r.status)
      ).length,
    [pendingReplenishment.list.data]
  );

  const enriched = useMemo(() => {
    const usageByIng = new Map<string, number>();
    const lastByIng = new Map<string, string>();
    const weekAgo = WEEK_AGO_MS;
    for (const m of movements as Array<{
      ingredient_id?: string;
      type?: string;
      quantity?: number;
      created_at?: string;
    }>) {
      const id = m.ingredient_id;
      if (!id) continue;
      if (
        (m.type === "outward" || m.type === "wastage") &&
        m.created_at &&
        new Date(m.created_at).getTime() >= weekAgo
      ) {
        usageByIng.set(id, (usageByIng.get(id) ?? 0) + Number(m.quantity ?? 0));
      }
      const prev = lastByIng.get(id);
      if (!prev || new Date(m.created_at ?? 0) > new Date(prev)) {
        if (m.created_at) lastByIng.set(id, m.created_at);
      }
    }
    return ingredients.map((i) => ({
      ...i,
      status: getStockStatus(i.current_stock, i.minimum_stock, i.maximum_stock),
      recentUsage: usageByIng.get(i.id) ?? 0,
      lastMovement: lastByIng.get(i.id) ?? null,
    }));
  }, [ingredients, movements]);

  const counts = useMemo(() => {
    let healthy = 0, low = 0, out = 0, over = 0, value = 0;
    for (const i of ingredients) {
      const s = getStockStatus(i.current_stock, i.minimum_stock, i.maximum_stock);
      if (s === "out") out++;
      else if (s === "low") low++;
      else if (s === "over") over++;
      else healthy++;
      value += (i.current_stock ?? 0) * (i.cost_per_unit ?? 0);
    }
    return { total: ingredients.length, healthy, low, out, over, value };
  }, [ingredients]);

  const statCards = [
    { label: "Total Ingredients", value: String(counts.total), icon: Package, tone: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", tint: "ring-blue-200 dark:ring-blue-800/50" },
    { label: "Healthy", value: String(counts.healthy), icon: CheckCircle2, tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", tint: "ring-emerald-200 dark:ring-emerald-800/50" },
    { label: "Low Stock", value: String(counts.low), icon: AlertTriangle, tone: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", tint: "ring-amber-200 dark:ring-amber-800/50" },
    { label: "Out of Stock", value: String(counts.out), icon: XCircle, tone: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", tint: "ring-red-200 dark:ring-red-800/50" },
    { label: "Overstock", value: String(counts.over), icon: ArrowUpCircle, tone: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", tint: "ring-violet-200 dark:ring-violet-800/50" },
    {
      label: "Inventory Value",
      value: counts.value.toLocaleString("en-PH", { style: "currency", currency: "PHP" }),
      icon: DollarSign,
      tone: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
      tint: "ring-teal-200 dark:ring-teal-800/50",
    },
    {
      label: "Pending Replenishments",
      value: pendingReplenishment.list.isLoading ? "…" : String(pendingCount),
      icon: ClipboardList,
      tone: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
      tint: "ring-indigo-200 dark:ring-indigo-800/50",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Monitoring"
        description="Observe stock health at a glance. Management lives in Ingredients and Recipes."
      />

      {/* Observation stat cards — all values live from the database */}
      {statsLoading ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
          {statCards.map((c) => (
            <div key={c.label} className={`rounded-lg border p-4 ring-1 ring-inset ${c.tint}`}>
              <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg ${c.tone}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-xl font-bold">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Inventory monitoring table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Ingredient</th>
              <th className="px-4 py-3 font-medium">Current Stock</th>
              <th className="px-4 py-3 font-medium">Minimum</th>
              <th className="px-4 py-3 font-medium">Maximum</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Recent Usage</th>
              <th className="px-4 py-3 font-medium">Last Movement</th>
              {canRequestReplenishment && <th className="px-4 py-3 font-medium">Action</th>}
            </tr>
          </thead>
          <tbody>
            {statsLoading ? (
              <tr>
                <td colSpan={canRequestReplenishment ? 8 : 7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td>
              </tr>
            ) : enriched.length === 0 ? (
              <tr>
                <td colSpan={canRequestReplenishment ? 8 : 7} className="px-4 py-8 text-center text-muted-foreground">
                  No ingredients tracked yet.
                </td>
              </tr>
            ) : (
              enriched.map((i) => (
                <tr key={i.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{i.name}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {Number(i.current_stock).toLocaleString()} {i.unit ?? ""}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {Number(i.minimum_stock).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {i.maximum_stock != null && Number(i.maximum_stock) > 0
                      ? Number(i.maximum_stock).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STOCK_STATUS_BADGE[i.status]}`}>
                      {STOCK_STATUS_LABEL[i.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {i.recentUsage > 0 ? `${Number(i.recentUsage).toLocaleString()} (7d)` : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {i.lastMovement
                      ? new Date(i.lastMovement).toLocaleDateString("en-PH", { month: "short", day: "numeric" })
                      : "No movement"}
                  </td>
                  {canRequestReplenishment && (
                    <td className="px-4 py-3">
                      {i.status === "low" || i.status === "out" ? (
                        <Link
                          className="text-sm font-medium text-primary hover:underline"
                          href={`/inventory/replenishment?ingredient_id=${encodeURIComponent(i.id)}&quantity=${encodeURIComponent(String(Math.max(0.001, (Number(i.maximum_stock) > 0 ? Number(i.maximum_stock) : Number(i.minimum_stock) * 2) - Number(i.current_stock))))}&priority=${i.status === "out" ? "urgent" : "high"}`}
                        >
                          Request Replenishment
                        </Link>
                      ) : "—"}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(movements as unknown[]).length > 0 && (
        <StockMovementTable movements={movements} isLoading={movementsLoading} />
      )}
    </div>
  );
}
