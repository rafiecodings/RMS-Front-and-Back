"use client";

import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Recipe } from "@/lib/types";

interface RecipeDetailProps {
  recipe: Recipe;
  canEdit?: boolean;
  onEdit?: () => void;
}

export function RecipeDetail({ recipe, canEdit, onEdit }: RecipeDetailProps) {
  const totalCost = (recipe.ingredients ?? []).reduce((sum, i) => sum + i.cost, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {recipe.menu_item_name ?? "Unknown Menu Item"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {(recipe.ingredients ?? []).length} ingredients • Total cost: {formatCurrency(totalCost)}
            </p>
          </div>
        </div>
        {canEdit && onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Ingredient</th>
              <th className="text-right px-4 py-3 font-medium">Quantity</th>
              <th className="text-left px-4 py-3 font-medium">Unit</th>
              <th className="text-right px-4 py-3 font-medium">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(recipe.ingredients ?? []).map((ri) => (
              <tr key={ri.id} className="hover:bg-muted/30">
<td className="px-4 py-3">
                    <p className="font-medium">{ri.ingredient?.name ?? ri.name ?? "Unknown Ingredient"}</p>
                  {(ri.ingredient?.category) && (
                    <p className="text-xs text-muted-foreground capitalize">{ri.ingredient.category}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{ri.quantity}</td>
                <td className="px-4 py-3 text-muted-foreground">{ri.unit}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(ri.cost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30 font-medium">
              <td colSpan={3} className="px-4 py-3 text-right">Total Recipe Cost</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totalCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
