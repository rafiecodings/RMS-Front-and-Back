"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card";
import { Eye, Pencil, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
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
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl border bg-card animate-pulse" />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border py-12 text-muted-foreground">
          <BookOpen className="h-8 w-8" />
          <p>No recipes mapped yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recipes.map((r) => {
            const ingredients = r.ingredients ?? [];
            const totalCost = ingredients.reduce((sum, i) => sum + i.cost, 0);
            const isMapped = ingredients.length > 0;
            return (
              <Card key={r.id} size="sm">
                <CardHeader>
                  <CardTitle className="truncate pr-2" title={r.menu_item_name ?? "Unknown Menu Item"}>
                    {r.menu_item_name ?? "Unknown Menu Item"}
                  </CardTitle>
                  <CardDescription>Recipe</CardDescription>
                  <CardAction>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        isMapped
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300"
                      )}
                    >
                      {isMapped ? "Mapped" : "Unmapped"}
                    </Badge>
                  </CardAction>
                </CardHeader>

                <CardContent className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Yield</span>
                    <span className="tabular-nums font-medium">
                      {r.yield_quantity ? `${r.yield_quantity} ${r.yield_unit ?? ""}`.trim() : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Ingredients</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {ingredients.length} {ingredients.length === 1 ? "item" : "items"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Est. Cost</span>
                    <span className="tabular-nums font-medium">
                      {formatCurrency(totalCost)}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="justify-end gap-1">
                  {onView && (
                    <Button variant="ghost" size="icon-sm" onClick={() => onView(r)} aria-label={`View recipe`}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {canEdit && onEdit && (
                    <Button variant="ghost" size="icon-sm" onClick={() => onEdit(r)} aria-label={`Edit recipe`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

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
