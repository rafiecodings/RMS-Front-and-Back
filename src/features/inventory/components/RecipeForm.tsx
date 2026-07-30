"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIngredients, useMenuItems } from "@/lib/hooks";
import { Plus, Trash2 } from "lucide-react";
import type { RecipeFormData } from "@/lib/types";

interface RecipeFormProps {
  initialData?: RecipeFormData;
  onSubmit: (data: RecipeFormData) => void;
  isLoading?: boolean;
}

export function RecipeForm({ initialData, onSubmit, isLoading }: RecipeFormProps) {
  const router = useRouter();
  const { list: ingredientsList } = useIngredients({ per_page: 200 });
  const { list: menuItemsList } = useMenuItems({ per_page: 200 });

  const ingredients = ingredientsList.data?.data?.data ?? [];
  const menuItems = menuItemsList.data?.data?.data ?? [];

  const [form, setForm] = useState<RecipeFormData>({
    menu_item_id: initialData?.menu_item_id ?? "",
    ingredients: initialData?.ingredients ?? [],
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.menu_item_id || form.ingredients.length === 0) return;
    onSubmit(form);
  }

  function addIngredient() {
    setForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { ingredient_id: "", quantity: 1, unit: "pcs" }],
    }));
  }

  function removeIngredient(index: number) {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  }

  function updateIngredient(index: number, field: "ingredient_id" | "quantity" | "unit", value: string | number) {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing
      ),
    }));
  }

  const UNITS = ["kg", "g", "mg", "L", "mL", "oz", "lb", "pcs", "bunch", "pack"];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Menu Item</h3>
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Menu Item *</label>
          <Select value={form.menu_item_id} onValueChange={(v) => setForm((prev) => ({ ...prev, menu_item_id: v ?? "" }))}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a menu item" />
            </SelectTrigger>
            <SelectContent>
              {menuItems.map((mi) => (
                <SelectItem key={mi.id} value={mi.id}>{mi.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ingredients</h3>
          <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {form.ingredients.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Click &ldquo;Add&rdquo; to map ingredients to this recipe
          </p>
        ) : (
          <div className="space-y-3">
            {form.ingredients.map((ing, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Select
                  value={ing.ingredient_id}
                  onValueChange={(v) => updateIngredient(idx, "ingredient_id", v ?? "")}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select ingredient" />
                  </SelectTrigger>
                  <SelectContent>
                    {ingredients.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name} ({i.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={ing.quantity}
                  onChange={(e) => updateIngredient(idx, "quantity", parseFloat(e.target.value) || 0)}
                  className="w-24"
                  placeholder="Qty"
                />
                <Select value={ing.unit} onValueChange={(v) => updateIngredient(idx, "unit", v ?? ing.unit)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeIngredient(idx)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !form.menu_item_id || form.ingredients.length === 0}
        >
          {isLoading ? "Saving..." : initialData ? "Update Recipe" : "Create Recipe"}
        </Button>
      </div>
    </form>
  );
}
