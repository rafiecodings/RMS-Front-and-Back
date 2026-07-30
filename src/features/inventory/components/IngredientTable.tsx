"use client";

import Link from "next/link";
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
import { Search, Eye, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { TableLoadingRows, TableEmptyRow } from "@/components/shared";
import { formatCurrency } from "@/lib/utils";
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
  { value: "beverages", label: "Beverages" },
  { value: "other", label: "Other" },
];

function stockStatus(ingredient: Ingredient) {
  if (ingredient.current_stock <= 0) return { label: "Out of Stock", variant: "destructive" as const };
  if (ingredient.current_stock <= ingredient.minimum_stock) return { label: "Low Stock", variant: "secondary" as const };
  return { label: "In Stock", variant: "default" as const };
}

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
}: IngredientTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search ingredients..."
            className="h-9 pl-8"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => onCategoryFilterChange(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[160px] h-9">
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

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Category</th>
              <th className="text-right px-4 py-3 font-medium">Stock</th>
              <th className="text-right px-4 py-3 font-medium">Min</th>
              <th className="text-right px-4 py-3 font-medium">Cost/Unit</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
              <th className="text-center px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <TableLoadingRows colSpan={7} />
            ) : ingredients.length === 0 ? (
              <TableEmptyRow message="No ingredients found" colSpan={7} />
            ) : (
              ingredients.map((item) => {
                const status = stockStatus(item);
                const isLow = item.current_stock <= item.minimum_stock;
                return (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">
                      {item.category ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {item.current_stock} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                      {item.minimum_stock}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(item.cost_per_unit)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button variant="ghost" size="icon-sm" render={<Link href={`/inventory/ingredients/${item.id}`} />}>
                        <Eye className="h-4 w-4" />
                      </Button>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
