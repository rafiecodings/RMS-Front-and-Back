"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, EmptyState, LoadingSpinner } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StockAdjustDialog } from "@/features/inventory";
import { useIngredients, useStockAdjust, useStockMovements } from "@/lib/hooks";
import { StockMovementTable } from "@/features/inventory";
import { formatCurrency } from "@/lib/utils";
import { Pencil, PackagePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function IngredientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { list } = useIngredients({ per_page: 200 });
  const ingredients = list.data?.data?.data ?? [];
  const ingredient = ingredients.find((i) => i.id === id);

  const { data: movementsData, isLoading: movementsLoading } = useStockMovements({
    ingredient_id: id,
    per_page: 20,
  });
  const movements = movementsData?.data?.data ?? [];

  const adjustStock = useStockAdjust();
  const [adjustOpen, setAdjustOpen] = useState(false);

  if (list.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!ingredient) {
    return (
      <EmptyState
        title="Ingredient not found"
        description="This ingredient may have been deleted."
        action={<Button onClick={() => router.push("/inventory/ingredients")}>Back to Ingredients</Button>}
      />
    );
  }

  const stockStatus =
    ingredient.current_stock <= 0
      ? { label: "Out of Stock", className: "bg-red-100 text-red-800" }
      : ingredient.current_stock <= ingredient.minimum_stock
      ? { label: "Low Stock", className: "bg-amber-100 text-amber-800" }
      : { label: "In Stock", className: "bg-green-100 text-green-800" };

  function handleAdjust(data: { ingredient_id: string; type: "in" | "out" | "adjustment"; quantity: number; notes?: string }) {
    adjustStock.mutate(data, {
      onSuccess: () => toast.success("Stock adjusted successfully"),
      onError: (e: Error) => toast.error(e.message || "Failed to adjust stock"),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={ingredient.name}
        description={ingredient.description}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setAdjustOpen(true)}>
              <PackagePlus className="h-4 w-4 mr-1" />
              Adjust Stock
            </Button>
            <Button render={<Link href={`/inventory/ingredients/${id}/edit`} />}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Current Stock</p>
          <p className="text-2xl font-bold tabular-nums">{ingredient.current_stock} {ingredient.unit}</p>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mt-1 ${stockStatus.className}`}>
            {stockStatus.label}
          </span>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Minimum Stock</p>
          <p className="text-2xl font-bold tabular-nums">{ingredient.minimum_stock} {ingredient.unit}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Cost per Unit</p>
          <p className="text-2xl font-bold tabular-nums">{formatCurrency(ingredient.cost_per_unit)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Total Value</p>
          <p className="text-2xl font-bold tabular-nums">
            {formatCurrency(ingredient.current_stock * ingredient.cost_per_unit)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Category</p>
          <p className="font-medium capitalize">{ingredient.category ?? "—"}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Supplier</p>
          <p className="font-medium">{ingredient.supplier?.name ?? "—"}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Storage Location</p>
          <p className="font-medium">{ingredient.storage_location ?? "—"}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Expiry Date</p>
          <p className="font-medium">
            {ingredient.expiry_date
              ? new Date(ingredient.expiry_date).toLocaleDateString("en-PH")
              : "—"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Maximum Stock</p>
          <p className="font-medium tabular-nums">{ingredient.maximum_stock} {ingredient.unit}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <Badge variant={ingredient.is_active ? "default" : "secondary"}>
            {ingredient.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <StockMovementTable movements={movements} isLoading={movementsLoading} />

      <StockAdjustDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        onSubmit={handleAdjust}
        isLoading={adjustStock.isPending}
      />
    </div>
  );
}
