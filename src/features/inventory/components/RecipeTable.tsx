"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Pencil, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { TableLoadingRows } from "@/components/shared";
import { formatCurrency } from "@/lib/utils";
import type { Recipe } from "@/lib/types";

interface RecipeTableProps {
  recipes: Recipe[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  canEdit?: boolean;
  onView?: (recipe: Recipe) => void;
  onEdit?: (recipe: Recipe) => void;
}

export function RecipeTable({
  recipes,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
  canEdit,
  onView,
  onEdit,
}: RecipeTableProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Menu Item</th>
              <th className="text-center px-4 py-3 font-medium">Ingredients</th>
              <th className="text-right px-4 py-3 font-medium">Total Cost</th>
              <th className="text-center px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <TableLoadingRows colSpan={4} />
            ) : recipes.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <BookOpen className="h-8 w-8" />
                    <p>No recipes mapped yet</p>
                  </div>
                </td>
              </tr>
            ) : (
              recipes.map((r) => {
                const totalCost = (r.ingredients ?? []).reduce((sum, i) => sum + i.cost, 0);
                return (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.menu_item_name ?? "Unknown Menu Item"}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="secondary">{(r.ingredients ?? []).length} items</Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totalCost)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onView && (
                          <Button variant="ghost" size="icon-sm" onClick={() => onView(r)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {canEdit && onEdit && (
                          <Button variant="ghost" size="icon-sm" onClick={() => onEdit(r)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
