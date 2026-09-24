"use client";

import { useState, useRef, useMemo } from "react";
import { PageHeader, ConfirmDialog, SearchInput, ErrorState, TablePagination, CardGridSkeleton, EmptyState } from "@/components/shared";
import {
  MenuItemList,
  MenuItemCard,
  MenuItemForm,
  MenuItemDetail,
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
import { useAuth } from "@/providers/AuthProvider";
import { canEdit } from "@/lib/utils/permissions";
import { DEBOUNCE_DELAY, ITEMS_PER_PAGE } from "@/lib/utils/constants";
import type { MenuItem, MenuItemFormData } from "@/lib/types";
import { toast } from "sonner";

function apiError(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { message?: string } } })
    ?.response?.data;
  return data?.message ?? fallback;
}

type MenuItemModal =
  | { mode: "add" }
  | { mode: "edit"; item: MenuItem }
  | { mode: "view"; item: MenuItem }
  | null;

export default function MenuItemsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"list" | "grid">("list");
  const [activeModal, setActiveModal] = useState<MenuItemModal>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user } = useAuth();
  const canEditMenu = canEdit(user?.role, "menu");

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

  const { list, create, update, remove, toggleAvailability } = useMenuItems(params);

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

  function handleCreate(data: MenuItemFormData) {
    create.mutate(data, {
      onSuccess: () => {
        toast.success("Menu item created");
        setActiveModal(null);
      },
      onError: (e) => toast.error(apiError(e, "Failed to create menu item")),
    });
  }

  function handleEdit(data: MenuItemFormData) {
    if (activeModal?.mode !== "edit") return;
    update.mutate(
      { id: activeModal.item.id, data },
      {
        onSuccess: () => {
          toast.success("Menu item updated");
          setActiveModal(null);
        },
        onError: (e) => toast.error(apiError(e, "Failed to update menu item")),
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
      onError: (e) => toast.error(apiError(e, "Failed to delete menu item")),
    });
  }

  function handleToggleAvailability(item: MenuItem) {
    toggleAvailability.mutate(item.id, {
      onSuccess: () =>
        toast.success(
          item.is_available ? "Item marked unavailable" : "Item marked available"
        ),
      onError: (e) => toast.error(apiError(e, "Failed to update item")),
    });
  }

  const categoryList = categories.list.data ?? [];

  return (
    <div className="min-w-0 overflow-hidden">
      <PageHeader
        title="Menu Items"
        description="Manage your restaurant menu"
        action={
          canEditMenu ? (
            <Button variant="default" size="default" onClick={() => setActiveModal({ mode: "add" })} className="shrink-0">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Item
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-6 min-w-0">
        <MenuStats items={items} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <Tabs
              value={view}
              onValueChange={(v) => v && setView(v as "list" | "grid")}
            >
              <TabsList>
                <TabsTrigger value="list" className="min-h-9">
                  <List className="h-4 w-4 mr-1.5" />
                  List
                </TabsTrigger>
                <TabsTrigger value="grid" className="min-h-9">
                  <LayoutGrid className="h-4 w-4 mr-1.5" />
                  Grid
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:w-auto min-w-0">
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Search items..."
              className="w-full sm:w-auto sm:flex-1 sm:max-w-sm min-w-0"
            />

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select
                value={categoryFilter}
                onValueChange={(val) => {
                  setCategoryFilter(val ?? "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="flex-1 min-w-0 sm:w-[150px] sm:flex-none">
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
                <SelectTrigger className="flex-1 min-w-0 sm:w-[140px] sm:flex-none">
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
        </div>

        <Tabs value={view} onValueChange={(v) => v && setView(v as "list" | "grid")}>
          <TabsContent value="list">
            {list.isError ? (
              <ErrorState message="Failed to load menu items. Please try again." />
            ) : (
              <MenuItemList
                items={items}
                isLoading={list.isLoading}
                onView={(item) => setActiveModal({ mode: "view", item })}
                onEdit={canEditMenu ? (item) => setActiveModal({ mode: "edit", item }) : undefined}
                onDelete={canEditMenu ? (item) => setDeleteTarget(item) : undefined}
                onToggleAvailability={canEditMenu ? handleToggleAvailability : undefined}
                canEditItem={canEditMenu}
              />
            )}
          </TabsContent>

          <TabsContent value="grid">
            {list.isError ? (
              <ErrorState message="Failed to load menu items. Please try again." />
            ) : list.isLoading ? (
              <CardGridSkeleton
                count={8}
                className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                lines={3}
              />
            ) : items.length === 0 ? (
              <EmptyState
                title="No menu items found"
                description="Try a different search, or add your first menu item."
                icon={<LayoutGrid className="h-8 w-8" />}
              />
            ) : (
              <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {meta && meta.last_page > 1 && (
          <TablePagination
            currentPage={meta.current_page}
            totalPages={meta.last_page}
            onPageChange={setPage}
          />
        )}
      </div>

      <Dialog
        open={activeModal?.mode === "add" || activeModal?.mode === "edit"}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {activeModal?.mode === "edit" ? "Edit Item" : "Add Item"}
            </DialogTitle>
          </DialogHeader>
          {activeModal?.mode === "add" || activeModal?.mode === "edit" ? (
            <MenuItemForm
              initialData={activeModal.mode === "edit" ? activeModal.item : undefined}
              categories={categoryList}
              isCategoriesLoading={categories.list.isLoading}
              onSubmit={activeModal.mode === "edit" ? handleEdit : handleCreate}
              isLoading={create.isPending || update.isPending}
              submitLabel={activeModal.mode === "edit" ? "Update Item" : "Create Item"}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeModal?.mode === "view"}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Menu Item Details</DialogTitle>
          </DialogHeader>
          {activeModal?.mode === "view" ? (
            <MenuItemDetail
              item={activeModal.item}
              canEdit={canEditMenu}
              onEdit={() =>
                setActiveModal({ mode: "edit", item: activeModal.item })
              }
            />
          ) : null}
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
