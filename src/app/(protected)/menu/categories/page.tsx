"use client";

import { useState } from "react";
import { PageHeader, ConfirmDialog, SearchInput } from "@/components/shared";
import { CategoryList, CategoryForm } from "@/features/menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useMenuCategories } from "@/lib/hooks";
import type { MenuCategory, MenuCategoryFormData } from "@/lib/types";
import { toast } from "sonner";

export default function MenuCategoriesPage() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MenuCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuCategory | null>(null);

  const { list, create, update, remove } = useMenuCategories();

  const categories = list.data ?? [];
  const filtered = search
    ? categories.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    : categories;

  function handleCreate(data: MenuCategoryFormData) {
    create.mutate(data, {
      onSuccess: () => {
        toast.success("Category created");
        setFormOpen(false);
      },
      onError: () => toast.error("Failed to create category"),
    });
  }

  function handleEdit(data: MenuCategoryFormData) {
    if (!editTarget) return;
    update.mutate(
      { id: editTarget.id, data },
      {
        onSuccess: () => {
          toast.success("Category updated");
          setEditTarget(null);
          setFormOpen(false);
        },
        onError: () => toast.error("Failed to update category"),
      }
    );
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Category deleted");
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete category"),
    });
  }

  function handleToggleActive(cat: MenuCategory) {
    update.mutate(
      { id: cat.id, data: { is_active: !cat.is_active } },
      {
        onSuccess: () =>
          toast.success(
            `Category ${cat.is_active ? "deactivated" : "activated"}`
          ),
        onError: () => toast.error("Failed to update category"),
      }
    );
  }

  function openCreate() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(cat: MenuCategory) {
    setEditTarget(cat);
    setFormOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Menu Categories"
        description="Organize menu items into categories"
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Category
          </Button>
        }
      />

      <div className="space-y-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search categories..."
        />

        <CategoryList
          categories={filtered}
          isLoading={list.isLoading}
          onEdit={openEdit}
          onDelete={(cat) => setDeleteTarget(cat)}
          onToggleActive={handleToggleActive}
        />
      </div>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFormOpen(false);
            setEditTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Category" : "New Category"}
            </DialogTitle>
          </DialogHeader>
          <CategoryForm
            initialData={editTarget ?? undefined}
            onSubmit={editTarget ? handleEdit : handleCreate}
            isLoading={create.isPending || update.isPending}
            submitLabel={editTarget ? "Update Category" : "Create Category"}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Category"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? Items in this category will become uncategorized.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        isLoading={remove.isPending}
      />
    </div>
  );
}
