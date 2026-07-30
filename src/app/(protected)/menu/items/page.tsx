"use client";

import { useState, useRef, useMemo } from "react";
import Link from "next/link";
import { PageHeader, ConfirmDialog, SearchInput } from "@/components/shared";
import {
  MenuItemList,
  MenuItemCard,
  MenuItemForm,
  MenuStats,
} from "@/features/menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, LayoutGrid, List } from "lucide-react";
import { useMenuCategories, useMenuItems } from "@/lib/hooks";
import { DEBOUNCE_DELAY, ITEMS_PER_PAGE } from "@/lib/utils/constants";
import type { MenuItem, MenuItemFormData } from "@/lib/types";
import { toast } from "sonner";

export default function MenuItemsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"list" | "grid">("list");
  const [quickFormOpen, setQuickFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MenuItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categories = useMenuCategories();

  const params = useMemo(() => ({
    page,
    per_page: ITEMS_PER_PAGE,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(categoryFilter !== "all" && { category_id: categoryFilter }),
    ...(availabilityFilter !== "all" && {
      is_available: availabilityFilter === "available",
    }),
  }), [page, debouncedSearch, categoryFilter, availabilityFilter]);

  const { list, create, update, remove } = useMenuItems(params);

  const items = list.data?.data?.data ?? [];
  const meta = list.data?.data?.meta;

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, DEBOUNCE_DELAY);
  }

  function handleQuickCreate(data: MenuItemFormData) {
    create.mutate(data, {
      onSuccess: () => {
        toast.success("Menu item created");
        setQuickFormOpen(false);
      },
      onError: () => toast.error("Failed to create menu item"),
    });
  }

  function handleQuickEdit(data: MenuItemFormData) {
    if (!editTarget) return;
    update.mutate(
      { id: editTarget.id, data },
      {
        onSuccess: () => {
          toast.success("Menu item updated");
          setEditTarget(null);
          setQuickFormOpen(false);
        },
        onError: () => toast.error("Failed to update menu item"),
      }
    );
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Menu item deleted");
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete menu item"),
    });
  }

  const categoryList = categories.list.data ?? [];

  return (
    <div>
      <PageHeader
        title="Menu Items"
        description="Manage your restaurant menu"
        action={
          <Button size="sm" render={<Link href="/menu/items/new" />}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Item
          </Button>
        }
      />

      <div className="space-y-6">
        <MenuStats items={items} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Tabs
              value={view}
              onValueChange={(v) => v && setView(v as "list" | "grid")}
            >
              <TabsList>
                <TabsTrigger value="list">
                  <List className="h-4 w-4 mr-1.5" />
                  List
                </TabsTrigger>
                <TabsTrigger value="grid">
                  <LayoutGrid className="h-4 w-4 mr-1.5" />
                  Grid
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-2">
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Search items..."
            />

            <Select
              value={categoryFilter}
              onValueChange={(val) => {
                setCategoryFilter(val ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoryList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={availabilityFilter}
              onValueChange={(val) => {
                setAvailabilityFilter(val ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={view} onValueChange={(v) => v && setView(v as "list" | "grid")}>
          <TabsContent value="list">
            <MenuItemList
              items={items}
              isLoading={list.isLoading}
              onDelete={(item) => setDeleteTarget(item)}
            />
          </TabsContent>

          <TabsContent value="grid">
            {list.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No menu items found</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(meta.current_page - 1) * meta.per_page + 1}–
              {Math.min(meta.current_page * meta.per_page, meta.total)} of{" "}
              {meta.total}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(meta.last_page, 5) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              {meta.last_page > 5 && (
                <span className="flex items-center px-1 text-muted-foreground">
                  …
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={quickFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            setQuickFormOpen(false);
            setEditTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Item" : "Quick Add Item"}
            </DialogTitle>
          </DialogHeader>
          <MenuItemForm
            initialData={editTarget ?? undefined}
            categories={categoryList}
            onSubmit={editTarget ? handleQuickEdit : handleQuickCreate}
            isLoading={create.isPending || update.isPending}
            submitLabel={editTarget ? "Update Item" : "Create Item"}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Menu Item"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        isLoading={remove.isPending}
      />
    </div>
  );
}
