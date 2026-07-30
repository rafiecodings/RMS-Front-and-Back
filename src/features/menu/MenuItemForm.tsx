"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared";
import type { MenuItem, MenuItemFormData, MenuCategory } from "@/lib/types";

interface MenuItemFormProps {
  initialData?: MenuItem;
  categories: MenuCategory[];
  onSubmit: (data: MenuItemFormData) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

interface FormErrors {
  name?: string;
  category_id?: string;
  price?: string;
}

function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function MenuItemForm({
  initialData,
  categories,
  onSubmit,
  isLoading,
  submitLabel = "Save Item",
}: MenuItemFormProps) {
  const [formData, setFormData] = useState<MenuItemFormData>({
    category_id: initialData?.category_id ?? "",
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    price: initialData?.price ?? 0,
    cost_price: initialData?.cost_price,
    is_available: initialData?.is_available ?? true,
    is_vegetarian: initialData?.is_vegetarian ?? false,
    is_vegan: initialData?.is_vegan ?? false,
    is_gluten_free: initialData?.is_gluten_free ?? false,
    preparation_time: initialData?.preparation_time,
    calories: initialData?.calories,
    allergens: initialData?.allergens ?? [],
    tags: initialData?.tags ?? [],
    station: initialData?.station ?? "",
  });

  const [tagsInput, setTagsInput] = useState(
    initialData?.tags?.join(", ") ?? ""
  );
  const [allergensInput, setAllergensInput] = useState(
    initialData?.allergens?.join(", ") ?? ""
  );

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!formData.name.trim()) errs.name = "Item name is required";
    if (!formData.category_id) errs.category_id = "Category is required";
    if (formData.price < 0) errs.price = "Price must be 0 or more";
    return errs;
  }

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errs = validate();
    setErrors(errs);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setTouched({ name: true, category_id: true, price: true });
    if (Object.keys(errs).length === 0) {
      onSubmit({
        ...formData,
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        tags: parseTags(tagsInput),
        allergens: parseTags(allergensInput),
        station: formData.station?.trim() || undefined,
      });
    }
  }

  const activeCategories = categories.filter((c) => c.is_active);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="item-name">Name *</Label>
          <Input
            id="item-name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            onBlur={() => handleBlur("name")}
            placeholder="e.g. Sisig, Adobo Rice Bowl"
            aria-invalid={touched.name && !!errors.name}
          />
          {touched.name && errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Category *</Label>
          <Select
            value={formData.category_id}
            onValueChange={(val) =>
              setFormData((prev) => ({ ...prev, category_id: val ?? "" }))
            }
          >
            <SelectTrigger
              className="w-full"
              aria-invalid={touched.category_id && !!errors.category_id}
            >
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {activeCategories.length === 0 ? (
                <SelectItem value="none" disabled>
                  No categories
                </SelectItem>
              ) : (
                activeCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {touched.category_id && errors.category_id && (
            <p className="text-xs text-destructive">{errors.category_id}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="item-desc">Description</Label>
        <Textarea
          id="item-desc"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Brief description of the dish"
          rows={2}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="item-price">Price (PHP) *</Label>
          <Input
            id="item-price"
            type="number"
            min={0}
            step={0.01}
            value={formData.price}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                price: parseFloat(e.target.value) || 0,
              }))
            }
            onBlur={() => handleBlur("price")}
            aria-invalid={touched.price && !!errors.price}
          />
          {touched.price && errors.price && (
            <p className="text-xs text-destructive">{errors.price}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="item-cost">Cost Price (PHP)</Label>
          <Input
            id="item-cost"
            type="number"
            min={0}
            step={0.01}
            value={formData.cost_price ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                cost_price: e.target.value ? parseFloat(e.target.value) : undefined,
              }))
            }
            placeholder="Optional"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="item-prep">Prep Time (min)</Label>
          <Input
            id="item-prep"
            type="number"
            min={0}
            value={formData.preparation_time ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                preparation_time: e.target.value ? parseInt(e.target.value) : undefined,
              }))
            }
            placeholder="e.g. 15"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="item-calories">Calories</Label>
          <Input
            id="item-calories"
            type="number"
            min={0}
            value={formData.calories ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                calories: e.target.value ? parseInt(e.target.value) : undefined,
              }))
            }
            placeholder="Optional"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="item-station">Station</Label>
          <Input
            id="item-station"
            value={formData.station}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, station: e.target.value }))
            }
            placeholder="e.g. Hot Kitchen, Cold Kitchen"
          />
        </div>

        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={formData.is_available}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_available: !!checked }))
              }
            />
            <span className="text-sm">Available for order</span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={formData.is_vegetarian}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, is_vegetarian: !!checked }))
            }
          />
          <span className="text-sm">Vegetarian</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={formData.is_vegan}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, is_vegan: !!checked }))
            }
          />
          <span className="text-sm">Vegan</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={formData.is_gluten_free}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, is_gluten_free: !!checked }))
            }
          />
          <span className="text-sm">Gluten Free</span>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="item-tags">Tags</Label>
          <Input
            id="item-tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Comma-separated, e.g. spicy, popular"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="item-allergens">Allergens</Label>
          <Input
            id="item-allergens"
            value={allergensInput}
            onChange={(e) => setAllergensInput(e.target.value)}
            placeholder="Comma-separated, e.g. nuts, dairy"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
