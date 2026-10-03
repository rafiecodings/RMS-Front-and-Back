"use client";

import { useEffect, useRef, useState } from "react";
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
import { LoadingSpinner, MenuItemImage } from "@/components/shared";
import { MENU_ITEM_IMAGES } from "@/lib/config/menu-item-images";
import type { MenuItem, MenuItemFormData, MenuCategory } from "@/lib/types";

interface MenuItemFormProps {
  initialData?: MenuItem;
  categories: MenuCategory[];
  isCategoriesLoading?: boolean;
  onSubmit: (data: MenuItemFormData, imageFile?: File | null) => void;
  isLoading?: boolean;
  submitLabel?: string;
  /**
   * Modal layout: fields live in a scrollable body and the actions are pinned
   * to a non-shrinking footer so they stay visible at any viewport height.
   */
  modal?: boolean;
  onCancel?: () => void;
}

interface FormErrors {
  name?: string;
  category_id?: string;
  price?: string;
}

export function MenuItemForm({
  initialData,
  categories,
  isCategoriesLoading = false,
  onSubmit,
  isLoading,
  submitLabel = "Save Item",
  modal = false,
  onCancel,
}: MenuItemFormProps) {
  const [formData, setFormData] = useState<MenuItemFormData>({
    category_id: initialData?.category_id ?? "",
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    price: initialData?.price ?? 0,
    image_url: initialData?.image_url ?? "",
    is_available: initialData?.is_available ?? true,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("Only image files are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFileError("Image must be 2MB or smaller.");
      return;
    }
    setFileError(null);
    setImageFile(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function clearImageFile() {
    setImageFile(null);
    setFileError(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!formData.name.trim()) errs.name = "Item name is required";
    if (!formData.category_id) errs.category_id = "Category is required";
    if (formData.price <= 0) errs.price = "Price must be greater than 0";
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
      onSubmit(
        {
          ...formData,
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
          // When a file was picked, the image URL is set by the upload request
          // that runs after save — don't overwrite it on the create/update call.
          image_url: imageFile ? undefined : formData.image_url?.trim() || undefined,
        },
        imageFile
      );
    }
  }

  const activeCategories = categories.filter((c) => c.is_active);
  const selectedCategory = categories.find((c) => c.id === formData.category_id);
  // Resolve the visible trigger label explicitly so the raw category UUID is
  // never user-facing: while categories load (or the referenced category is
  // missing) the Base UI Select would otherwise fall back to the raw value.
  const categoryTriggerLabel = isCategoriesLoading
    ? "Loading categories..."
    : (selectedCategory?.name ?? (formData.category_id ? "Unknown Category" : undefined));

  // Base UI's SelectValue falls back to the raw selected *value* when it has no
  // children, which would print the stored path ("/storage/menu-items/....png")
  // into the trigger. Resolve a real label instead: picked file name, preset
  // label, or a short marker for an already-uploaded image.
  const selectedPreset = MENU_ITEM_IMAGES.find((img) => img.path === formData.image_url);
  const imageTriggerLabel = imageFile
    ? imageFile.name
    : (selectedPreset?.label ?? (formData.image_url ? "Uploaded image" : undefined));

  return (
    <form
      onSubmit={handleSubmit}
      className={modal ? "flex min-h-0 flex-1 flex-col" : "space-y-4"}
    >
      <div className={modal ? "flex-1 overflow-y-auto px-6 py-5 space-y-4" : "space-y-4"}>
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
            disabled={isCategoriesLoading}
          >
            <SelectTrigger
              className="w-full"
              aria-invalid={touched.category_id && !!errors.category_id}
            >
              <SelectValue placeholder="Select category">
                {categoryTriggerLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {isCategoriesLoading ? (
                formData.category_id ? (
                  <SelectItem value={formData.category_id} disabled className="truncate">
                    Loading categories...
                  </SelectItem>
                ) : (
                  <SelectItem value="loading" disabled>
                    Loading categories...
                  </SelectItem>
                )
              ) : (
                <>
                  {activeCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="truncate">
                      {c.name}
                    </SelectItem>
                  ))}
                  {formData.category_id && !selectedCategory && (
                    <SelectItem value={formData.category_id} disabled className="truncate">
                      Unknown Category
                    </SelectItem>
                  )}
                  {activeCategories.length === 0 && !formData.category_id && (
                    <SelectItem value="none" disabled>
                      No categories
                    </SelectItem>
                  )}
                </>
              )}
            </SelectContent>
          </Select>
          {touched.category_id && errors.category_id && (
            <p className="text-xs text-destructive">{errors.category_id}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="item-desc">Description (optional)</Label>
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
            min={0.01}
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

        <div className="flex items-end pb-1 sm:col-span-2">
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

      {/* MENU IMAGE — static picker plus real file upload */}
      <div className="space-y-2">
        <Label>Menu Image (optional)</Label>
        <div className="flex items-start gap-3">
          <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border bg-muted">
            <MenuItemImage src={previewUrl ?? formData.image_url} alt={formData.name || "Menu item preview"} sizes="112px" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <Select
              value={formData.image_url || "none"}
              onValueChange={(val) => {
                const path = typeof val === "string" && val !== "none" ? val : "";
                setFormData((prev) => ({ ...prev, image_url: path }));
                if (path && imageFile) clearImageFile();
              }}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder="Choose menu image">
                  {imageTriggerLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="none">No image (placeholder)</SelectItem>
                {MENU_ITEM_IMAGES.map((img) => (
                  <SelectItem key={img.path} value={img.path}>
                    {img.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                aria-label="Upload menu item image"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                {imageFile ? "Replace File" : "Upload Image"}
              </Button>
              {imageFile ? (
                <button
                  type="button"
                  onClick={clearImageFile}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Remove
                </button>
              ) : null}
            </div>
            {imageFile ? (
              <p
                className="truncate text-xs text-muted-foreground"
                title={imageFile.name}
              >
                {imageFile.name} — uploaded when you save.
              </p>
            ) : null}
            {fileError ? (
              <p className="text-xs text-destructive" role="alert">
                {fileError}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Optional. Pick a preset, or upload a new photo (jpeg/png/webp, max 2MB).
              An uploaded photo replaces the current image on save.
            </p>
          </div>
        </div>
      </div>
      </div>

      <div
        className={
          modal
            ? "flex shrink-0 items-center justify-end gap-3 border-t border-border bg-muted/30 px-6 py-4"
            : "flex justify-end gap-2 pt-2"
        }
      >
        {modal && onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button
          type="submit"
          size={modal ? "sm" : undefined}
          disabled={isLoading}
          className={modal ? "bg-primary text-primary-foreground font-semibold px-5" : undefined}
        >
          {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
