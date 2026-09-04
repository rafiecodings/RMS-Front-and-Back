"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card";
import { Search, AlertTriangle, Eye, Pencil } from "lucide-react";
import { TablePagination } from "@/components/shared";
import { formatCurrency, cn } from "@/lib/utils";
import { getStockStatus, STOCK_STATUS_BADGE, STOCK_STATUS_LABEL, type StockStatus } from "@/lib/utils/inventoryStatus";
import type { Ingredient } from "@/lib/types";

interface IngredientTableProps {
  ingredients: Ingredient[];
  isLoading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (v: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  canEdit?: boolean;
  onView?: (ingredient: Ingredient) => void;
  onEdit?: (ingredient: Ingredient) => void;
}

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "meat", label: "Meat" },
  { value: "seafood", label: "Seafood" },
  { value: "vegetables", label: "Vegetables" },
  { value: "fruits", label: "Fruits" },
  { value: "dairy", label: "Dairy" },
  { value: "grains", label: "Grains" },
  { value: "spices", label: "Spices" },
  { value: "condiments", label: "Condiments" },
  { value: "pantry", label: "Pantry" },
  { value: "beverages", label: "Beverages" },
  { value: "other", label: "Other" },
];

const STATUS_RING: Record<StockStatus, string> = {
  healthy: "ring-emerald-200 dark:ring-emerald-800/50",
  low: "ring-amber-200 dark:ring-amber-800/50",
  out: "ring-red-200 dark:ring-red-800/50",
  over: "ring-violet-200 dark:ring-violet-800/50",
};

export function IngredientTable({
  ingredients,
  isLoading,
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  currentPage,
  totalPages,
  onPageChange,
  canEdit,
  onView,
  onEdit,
}: IngredientTableProps) {
  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1 min-w-0 w-full">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search ingredients..."
            className="h-9 pl-8"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => onCategoryFilterChange(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[160px] h-10 min-h-10">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl border bg-card animate-pulse" />
          ))}
        </div>
      ) : ingredients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border py-12">
          <p className="text-muted-foreground">No ingredients found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ingredients.map((item) => {
            const status = getStockStatus(item.current_stock, item.minimum_stock, item.maximum_stock);
            const isAlert = status === "low" || status === "out";
            return (
              <Card
                key={item.id}
                size="sm"
                className={cn("ring-1 ring-inset", STATUS_RING[status])}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5 truncate pr-2" title={item.name}>
                    {isAlert && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                    <span className="truncate">{item.name}</span>
                  </CardTitle>
                  <CardDescription className="capitalize">
                    {item.category ?? "Uncategorized"}
                  </CardDescription>
                  <CardAction>
                    <Badge
                      variant="secondary"
                      className={cn("text-[10px] px-1.5 py-0", STOCK_STATUS_BADGE[status])}
                    >
                      {STOCK_STATUS_LABEL[status]}
                    </Badge>
                  </CardAction>
                </CardHeader>

                <CardContent className="space-y-1.5 text-sm">
                  <div className="flex items-baseline justify-between">
                    <span className="text-muted-foreground">Current Stock</span>
                    <span className="font-semibold tabular-nums">
                      {item.current_stock} {item.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Min</span>
                    <span className="tabular-nums text-muted-foreground">{item.minimum_stock}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Max</span>
                    <span className="tabular-nums text-muted-foreground">
                      {item.maximum_stock > 0 ? item.maximum_stock : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cost / Unit</span>
                    <span className="tabular-nums">{formatCurrency(item.cost_per_unit)}</span>
                  </div>
                  {!item.is_active && (
                    <div className="pt-1">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Inactive
                      </Badge>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="justify-end gap-1">
                  {onView && (
                    <Button variant="ghost" size="icon-sm" onClick={() => onView(item)} aria-label={`View ${item.name}`}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {canEdit && onEdit && (
                    <Button variant="ghost" size="icon-sm" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
