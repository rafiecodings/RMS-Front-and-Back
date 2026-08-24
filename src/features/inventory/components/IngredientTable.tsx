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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, AlertTriangle, Eye, Pencil } from "lucide-react";
import { TableLoadingRows, TableEmptyRow, TablePagination } from "@/components/shared";
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
  canEdit,
  onView,
  onEdit,
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

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Min</TableHead>
              <TableHead className="text-right">Cost/Unit</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRows colSpan={7} />
            ) : ingredients.length === 0 ? (
              <TableEmptyRow message="No ingredients found" colSpan={7} />
            ) : (
              ingredients.map((item) => {
                const status = stockStatus(item);
                const isLow = item.current_stock <= item.minimum_stock;
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {item.category ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {item.current_stock} {item.unit}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {item.minimum_stock}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(item.cost_per_unit)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Badge variant={status.variant} className="text-[10px] px-1.5 py-0">
                          {status.label}
                        </Badge>
                        {!item.is_active && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onView && (
                          <Button variant="ghost" size="icon-sm" onClick={() => onView(item)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {canEdit && onEdit && (
                          <Button variant="ghost" size="icon-sm" onClick={() => onEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}


