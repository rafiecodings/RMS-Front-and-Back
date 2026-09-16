"use client";

import { TableLoadingRows, TableEmptyRow } from "@/components/shared";
import { formatDate } from "@/lib/utils";
import type { StockMovement } from "@/lib/types";

interface StockMovementTableProps {
  movements: StockMovement[];
  isLoading: boolean;
}

const TYPE_STYLES: Record<string, string> = {
  inward: "bg-emerald-100 text-emerald-800",
  outward: "bg-red-100 text-red-800",
  adjustment: "bg-blue-100 text-blue-800",
  wastage: "bg-amber-100 text-amber-800",
};

export function StockMovementTable({ movements, isLoading }: StockMovementTableProps) {
  return (
    <div className="rounded-lg border overflow-hidden max-w-full">
      <div className="bg-muted/50 px-4 py-2 text-sm font-semibold">Recent Stock Movements</div>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left px-4 py-2 font-medium">Ingredient</th>
              <th className="text-center px-4 py-2 font-medium">Type</th>
              <th className="text-right px-4 py-2 font-medium">Quantity</th>
              <th className="text-left px-4 py-2 font-medium">Notes</th>
              <th className="text-left px-4 py-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <TableLoadingRows colSpan={5} />
            ) : movements.length === 0 ? (
              <TableEmptyRow message="No stock movements recorded" colSpan={5} />
            ) : (
              movements.map((m) => (
                <tr key={m.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 max-w-[180px] truncate" title={m.ingredient?.name ?? "Unknown Ingredient"}>{m.ingredient?.name ?? "Unknown Ingredient"}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_STYLES[m.type] ?? ""}`}>
                      {m.type === "inward" ? "Inward" : m.type === "outward" ? "Outward" : m.type === "adjustment" ? "Adjustment" : "Wastage"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {m.type === "outward" || m.type === "wastage" ? "-" : "+"}{m.quantity}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground truncate max-w-[200px]" title={m.notes ?? undefined}>{m.notes ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {formatDate(m.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="md:hidden p-3 space-y-3 bg-muted/20 max-w-full overflow-hidden">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 animate-pulse h-32" />
          ))
        ) : movements.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">No stock movements recorded</div>
        ) : (
          movements.map((m) => (
            <div key={m.id} className="rounded-xl border bg-card p-4 min-w-0 overflow-hidden">
              <div className="flex items-start justify-between gap-2 min-w-0">
                <p className="font-medium truncate min-w-0 flex-1" title={m.ingredient?.name ?? "Unknown Ingredient"}>{m.ingredient?.name ?? "Unknown Ingredient"}</p>
                <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_STYLES[m.type] ?? ""}`}>
                  {m.type === "inward" ? "Stock In" : m.type === "outward" ? "Stock Out" : m.type === "adjustment" ? "Adjustment" : "Wastage"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm min-w-0">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Quantity</p>
                  <p className="font-semibold tabular-nums truncate">{m.type === "outward" || m.type === "wastage" ? "-" : "+"}{m.quantity}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="truncate text-muted-foreground text-xs">{formatDate(m.created_at)}</p>
                </div>
              </div>
              <div className="mt-2 min-w-0">
                <p className="text-xs text-muted-foreground">Notes / Reference</p>
                <p className="text-sm break-words line-clamp-2">{m.notes ?? "—"}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
