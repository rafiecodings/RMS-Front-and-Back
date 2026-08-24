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
    <div className="rounded-lg border overflow-x-auto">
      <div className="bg-muted/50 px-4 py-2 text-sm font-semibold">Recent Stock Movements</div>
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
                <td className="px-4 py-2">{m.ingredient?.name ?? "Unknown Ingredient"}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_STYLES[m.type] ?? ""}`}>
                    {m.type === "inward" ? "Inward" : m.type === "outward" ? "Outward" : m.type === "adjustment" ? "Adjustment" : "Wastage"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {m.type === "outward" || m.type === "wastage" ? "-" : "+"}{m.quantity}
                </td>
                <td className="px-4 py-2 text-muted-foreground truncate max-w-[200px]">{m.notes ?? "—"}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {formatDate(m.created_at)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
