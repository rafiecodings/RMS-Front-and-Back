"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
    instructions: initialData?.instructions ?? "",
    yield_quantity: initialData?.yield_quantity ?? 1,
    yield_unit: initialData?.yield_unit ?? "serving",
    ingredients: initialData?.ingredients ?? [],
  });

  const [formError, setFormError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.menu_item_id) {
      setFormError("Select a menu item for this recipe.");
      return;
    }
    if (form.ingredients.length === 0) {
      setFormError("Add at least one ingredient to the recipe.");
      return;
    }

    const ids = form.ingredients.map((i) => i.ingredient_id).filter(Boolean);
    if (ids.length !== new Set(ids).size) {
      setFormError("Each ingredient can only be added once per recipe.");
      return;
    }
    if (form.ingredients.some((i) => !i.ingredient_id)) {
      setFormError("Every ingredient row must have an ingredient selected.");
      return;
    }
    if (form.ingredients.some((i) => !i.unit)) {
      setFormError("Every ingredient row must have a unit.");
      return;
    }
    if (form.ingredients.some((i) => !(Number(i.quantity) > 0))) {
      setFormError("Every ingredient quantity must be greater than zero.");
      return;
    }
    if (!(Number(form.yield_quantity) > 0)) {
      setFormError("Yield quantity must be greater than zero.");
      return;
    }
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
      ingredients: prev.ingredients.map((ing, i) => {
        if (i !== index) return ing;
        const updated = { ...ing, [field]: value };
        // When an ingredient is selected, default the row unit to that
        // ingredient's base unit (the recipe may still override it).
        if (field === "ingredient_id" && value) {
          const selected = ingredients.find((ing2) => ing2.id === value);
          if (selected) updated.unit = selected.unit;
        }
        return updated;
      }),
    }));
  }

  const UNITS = ["kg", "g", "mg", "L", "mL", "oz", "lb", "pcs", "bunch", "pack"];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Menu Item</h3>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Select Menu Item *</Label>
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
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Yield</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Yield Quantity *</Label>
            <Input
              type="number"
              min={0.01}
              step={0.01}
              value={form.yield_quantity}
              onChange={(e) => setForm((prev) => ({ ...prev, yield_quantity: parseFloat(e.target.value) || 0 }))}
              placeholder="e.g. 1"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Yield Unit *</Label>
            <Select value={form.yield_unit} onValueChange={(v) => setForm((prev) => ({ ...prev, yield_unit: v ?? "serving" }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="serving">Serving</SelectItem>
                <SelectItem value="piece">Piece</SelectItem>
                <SelectItem value="portion">Portion</SelectItem>
                <SelectItem value="plate">Plate</SelectItem>
                <SelectItem value="cup">Cup</SelectItem>
                <SelectItem value="bowl">Bowl</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Instructions</Label>
          <Textarea
            value={form.instructions ?? ""}
            onChange={(e) => setForm((prev) => ({ ...prev, instructions: e.target.value }))}
            placeholder="Optional preparation instructions"
            rows={3}
          />
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
                        {i.name}
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
        {formError && (
          <p className="text-xs text-destructive self-center">{formError}</p>
        )}
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
