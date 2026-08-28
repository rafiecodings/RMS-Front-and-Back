"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared";
import { PackageSearch, RefreshCw, AlertTriangle } from "lucide-react";
import { useIngredientForecast } from "../hooks/useDemandForecast";

const STATUS_STYLES: Record<string, string> = {
  "Out of Stock": "bg-red-500/10 text-red-600",
  "Restock Urgent": "bg-red-500/10 text-red-500",
  "Restock Recommended": "bg-amber-500/10 text-amber-600",
  Sufficient: "bg-emerald-500/10 text-emerald-600",
};

/**
 * Inventory restock risk: TimechoAI demand forecast → Laravel recipe/stock
 * arithmetic. Shown to admin/manager/inventory staff only.
 */
export function InventoryForecastCard() {
  const [horizon] = [7] as const;
  const { data, isLoading, isError, refetch } = useIngredientForecast({ horizon });

  const risks = (data?.projected_requirements ?? []).filter(
    (r) => r.status !== "Sufficient"
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <PackageSearch className="h-4 w-4 text-primary" />
            AI Inventory Forecast
            <Badge variant="secondary" className="text-[10px]">Next {horizon} days</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Inventory Risk Forecast — projected demand vs. current stock
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => refetch()} aria-label="Refresh forecast">
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="default" />
          </div>
        ) : isError ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">Inventory risk temporarily unavailable.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : !data?.available ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {data?.reason === "insufficient_history"
              ? "Not enough sales history for inventory projections yet."
              : "Inventory risk temporarily unavailable."}
          </p>
        ) : risks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No projected shortages — stock covers the forecast period.
          </p>
        ) : (
          <ul className="space-y-2">
            {risks.slice(0, 8).map((r) => (
              <li
                key={r.ingredient_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Current: {r.current_stock} {r.unit} · Projected need:{" "}
                    {r.projected_requirement} {r.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold tabular-nums">
                    −{r.projected_shortage} {r.unit}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[r.status] ?? ""}`}
                  >
                    {(r.status === "Out of Stock" || r.status === "Restock Urgent") && (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    {r.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
