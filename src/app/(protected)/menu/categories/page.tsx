"use client";

import { useState } from "react";
import { PageHeader, ConfirmDialog, SearchInput, ErrorState } from "@/components/shared";
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
import { useAuth } from "@/providers/AuthProvider";
import { canEdit } from "@/lib/utils/permissions";
import type { MenuCategory, MenuCategoryFormData } from "@/lib/types";
import { toast } from "sonner";

function apiError(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { message?: string } } })
    ?.response?.data;
  return data?.message ?? fallback;
}

export default function MenuCategoriesPage() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MenuCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuCategory | null>(null);

  const { user } = useAuth();
  const canEditMenu = canEdit(user?.role, "menu");

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
      onError: (e) => toast.error(apiError(e, "Failed to create category")),
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
        onError: (e) => toast.error(apiError(e, "Failed to update category")),
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
      onError: (e) => toast.error(apiError(e, "Failed to delete category")),
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
        onError: (e) => toast.error(apiError(e, "Failed to update category")),
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
          canEditMenu ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Category
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search categories..."
        />

        {list.isError ? (
          <ErrorState message="Failed to load categories. Please try again." />
        ) : (
          <CategoryList
            categories={filtered}
            isLoading={list.isLoading}
            onEdit={canEditMenu ? openEdit : undefined}
            onDelete={
              canEditMenu
                ? (cat) => {
                    // Backend refuses to delete categories that still have items.
                    if ((cat.items_count ?? 0) > 0) {
                      toast.error(
                        "This category still has menu items. Move or delete them first."
                      );
                      return;
                    }
                    setDeleteTarget(cat);
                  }
                : undefined
            }
            onToggleActive={canEditMenu ? handleToggleActive : undefined}
          />
        )}
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
        <DialogContent className="sm:max-w-md max-h-[calc(100dvh-24px)] overflow-y-auto">
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
            existingNames={categories
              .filter((c) => c.id !== editTarget?.id)
              .map((c) => c.name)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Category"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone. Categories with menu items cannot be deleted.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        isLoading={remove.isPending}
      />
    </div>
  );
}
