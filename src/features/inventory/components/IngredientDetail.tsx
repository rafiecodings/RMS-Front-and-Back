"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StockAdjustDialog, StockMovementTable } from "@/features/inventory";
import { useIngredients, useStockAdjust, useStockMovements } from "@/lib/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { canEdit as canEditRole } from "@/lib/utils/permissions";
import { formatCurrency } from "@/lib/utils";
import { Pencil, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import type { Ingredient, StockAdjustFormData } from "@/lib/types";

function apiError(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { message?: string } } })
    ?.response?.data;
  return data?.message ?? fallback;
}

interface IngredientDetailProps {
  ingredient: Ingredient;
  canEdit?: boolean;
  onEdit?: () => void;
}

export function IngredientDetail({
  ingredient,
  canEdit,
  onEdit,
}: IngredientDetailProps) {
  const { user } = useAuth();
  const canModify = canEdit ?? canEditRole(user?.role, "inventory");

  const { data: movementsData, isLoading: movementsLoading } = useStockMovements({
    ingredient_id: ingredient.id,
    per_page: 20,
  });
  const movements = movementsData?.data?.data ?? [];

  const { update } = useIngredients({ per_page: 200 });
  const adjustStock = useStockAdjust();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [activeConfirm, setActiveConfirm] = useState(false);

  const stockStatus =
    ingredient.current_stock <= 0
      ? { label: "Out of Stock", className: "bg-red-100 text-red-800" }
      : ingredient.current_stock <= ingredient.minimum_stock
        ? { label: "Low Stock", className: "bg-amber-100 text-amber-800" }
        : { label: "In Stock", className: "bg-green-100 text-green-800" };

  function handleAdjust(data: StockAdjustFormData) {
    adjustStock.mutate(data, {
      onSuccess: () => toast.success("Stock adjusted successfully"),
      onError: (e: Error) => toast.error(e.message || "Failed to adjust stock"),
    });
  }

  function handleToggleActive() {
    update.mutate(
      { id: ingredient.id, data: { is_active: !ingredient.is_active } },
      {
        onSuccess: () =>
          toast.success(
            ingredient.is_active ? "Ingredient deactivated" : "Ingredient activated"
          ),
        onError: (e) => toast.error(apiError(e, "Failed to update ingredient")),
      }
    );
    setActiveConfirm(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {canModify && (
          <>
            <Button variant="outline" size="sm" onClick={() => setAdjustOpen(true)}>
              <PackagePlus className="h-4 w-4 mr-1" />
              Adjust Stock
            </Button>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </>
        )}
      </div>

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
          <p className="text-xs text-muted-foreground">Maximum Stock</p>
          <p className="font-medium tabular-nums">{ingredient.maximum_stock} {ingredient.unit}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={ingredient.is_active ? "default" : "secondary"}>
              {ingredient.is_active ? "Active" : "Inactive"}
            </Badge>
            {canModify && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveConfirm(true)}
              >
                {ingredient.is_active ? "Deactivate" : "Activate"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <StockMovementTable movements={movements} isLoading={movementsLoading} />

      <StockAdjustDialog
        ingredientId={ingredient.id}
        ingredientName={ingredient.name}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        onSubmit={handleAdjust}
        isLoading={adjustStock.isPending}
      />

      <ConfirmDialog
        open={activeConfirm}
        onOpenChange={setActiveConfirm}
        title={ingredient.is_active ? "Deactivate Ingredient" : "Activate Ingredient"}
        description={
          ingredient.is_active
            ? `Deactivating "${ingredient.name}" hides it from active selection lists but retains its stock history.`
            : `Activate "${ingredient.name}" to make it selectable again?`
        }
        confirmText={ingredient.is_active ? "Deactivate" : "Activate"}
        variant={ingredient.is_active ? "destructive" : "default"}
        onConfirm={handleToggleActive}
        isLoading={update.isPending}
      />
    </div>
  );
}
