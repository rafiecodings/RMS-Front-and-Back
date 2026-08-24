"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared";
import { useIngredients, useStockMovements } from "@/lib/hooks";
import { IngredientStats, StockMovementTable } from "@/features/inventory";
import { Package, ShoppingCart, BookOpen, ArrowRight } from "lucide-react";

export default function InventoryPage() {
  const { list: ingredientsList } = useIngredients({ per_page: 200 });
  const statsLoading = ingredientsList.isLoading;
  const ingredients = useMemo(() => ingredientsList.data?.data?.data ?? [], [ingredientsList.data]);

  const lowStock = ingredients.filter(
    (i: { current_stock: number; minimum_stock: number }) => i.current_stock <= i.minimum_stock
  ).length;

  const totalValue = ingredients.reduce(
    (sum: number, i: { current_stock: number; cost_per_unit: number }) => sum + i.current_stock * i.cost_per_unit,
    0
  );

  const movementsList = useStockMovements({ per_page: 10 });
  const movementsLoading = movementsList.isLoading;
  const movements = movementsList.data?.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Manage ingredients, suppliers, recipes, and purchase orders"
      />

      <IngredientStats
        stats={{ total: ingredients.length, lowStock, totalValue }}
        isLoading={statsLoading}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/inventory/ingredients" className="group">
          <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              <Package className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Ingredients</h3>
              <p className="text-xs text-muted-foreground">Manage ingredient catalog</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link href="/inventory/suppliers" className="group">
          <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Suppliers</h3>
              <p className="text-xs text-muted-foreground">Manage supplier directory</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link href="/inventory/recipes" className="group">
          <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Recipes</h3>
              <p className="text-xs text-muted-foreground">Map menu items to ingredients</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/inventory/purchase-orders" className="group">
          <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Purchase Orders</h3>
              <p className="text-xs text-muted-foreground">Create and manage POs</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link href="/inventory/ingredients" className="group">
          <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
              <Package className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Quick Stock Adjust</h3>
              <p className="text-xs text-muted-foreground">Adjust stock levels</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>

      {movements.length > 0 && (
        <StockMovementTable movements={movements} isLoading={movementsLoading} />
      )}
    </div>
  );
}
