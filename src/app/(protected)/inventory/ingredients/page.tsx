"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IngredientTable, IngredientForm, IngredientDetail } from "@/features/inventory";
import { useIngredients } from "@/lib/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { canManageIngredients } from "@/lib/utils/permissions";
import { Plus } from "lucide-react";
import type { Ingredient, IngredientFormData } from "@/lib/types";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared";

type IngredientModal =
  | { mode: "add" }
  | { mode: "edit"; item: Ingredient }
  | { mode: "view"; item: Ingredient }
  | null;

export default function IngredientsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [activeModal, setActiveModal] = useState<IngredientModal>(null);

  const { list, create, update } = useIngredients({
    page,
    per_page: 20,
    search: search || undefined,
    category: categoryFilter === "all" ? undefined : categoryFilter,
  });

  const ingredients = list.data?.data?.data ?? [];
  const totalPages = list.data?.data?.meta?.last_page ?? 1;
  const { user } = useAuth();
  const canModify = canManageIngredients(user?.role);

  const existingNames =
    activeModal?.mode === "edit"
      ? ingredients
          .filter((i) => i.id !== activeModal.item.id)
          .map((i) => i.name.toLowerCase())
      : ingredients.map((i) => i.name.toLowerCase());

  function handleCreate(data: IngredientFormData) {
    create.mutate(data, {
      onSuccess: () => {
        toast.success("Ingredient created");
        setActiveModal(null);
      },
      onError: () => toast.error("Failed to create ingredient"),
    });
  }

  function handleEdit(data: IngredientFormData) {
    if (activeModal?.mode !== "edit") return;
    const { current_stock: _omitStock, ...editPayload } = data;
    update.mutate(
      { id: activeModal.item.id, data: editPayload },
      {
        onSuccess: () => {
          toast.success("Ingredient updated");
          setActiveModal(null);
        },
        onError: (error) => {
          const message = (error as { response?: { data?: { message?: string } } })
            .response?.data?.message;
          toast.error(message || "Failed to update ingredient");
        },
      }
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ingredients"
        description="Manage your ingredient catalog and stock levels"
        action={
          canModify ? (
            <Button onClick={() => setActiveModal({ mode: "add" })}>
              <Plus className="h-4 w-4 mr-1" />
              Add Ingredient
            </Button>
          ) : undefined
        }
      />

      {list.isError ? (
        <ErrorState message="Failed to load ingredients. Please try again." onRetry={() => list.refetch()} />
      ) : (
        <IngredientTable
          ingredients={ingredients}
          isLoading={list.isLoading}
          isError={list.isError}
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={(v) => {
            setCategoryFilter(v);
            setPage(1);
          }}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          canEdit={canModify}
          onView={(item) => setActiveModal({ mode: "view", item })}
          onEdit={canModify ? (item) => setActiveModal({ mode: "edit", item }) : undefined}
        />
      )}

      <Dialog
        open={activeModal?.mode === "add" || activeModal?.mode === "edit"}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
            <DialogTitle>
              {activeModal?.mode === "edit" ? "Edit Ingredient" : "Add Ingredient"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4">
            {activeModal?.mode === "add" || activeModal?.mode === "edit" ? (
              <IngredientForm
                initialData={activeModal.mode === "edit" ? activeModal.item : undefined}
                existingNames={existingNames}
                onSubmit={activeModal.mode === "edit" ? handleEdit : handleCreate}
                isLoading={create.isPending || update.isPending}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeModal?.mode === "view"}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
            <DialogTitle>Ingredient Details</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4">
            {activeModal?.mode === "view" ? (
              <IngredientDetail
                ingredient={activeModal.item}
                canEdit={canModify}
                onEdit={() => setActiveModal({ mode: "edit", item: activeModal.item })}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
