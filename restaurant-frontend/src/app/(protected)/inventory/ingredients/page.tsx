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
import { canEdit } from "@/lib/utils/permissions";
import { Plus } from "lucide-react";
import type { Ingredient, IngredientFormData } from "@/lib/types";
import { toast } from "sonner";

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
  const canModify = canEdit(user?.role, "inventory");

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
    update.mutate(
      { id: activeModal.item.id, data },
      {
        onSuccess: () => {
          toast.success("Ingredient updated");
          setActiveModal(null);
        },
        onError: () => toast.error("Failed to update ingredient"),
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

      <IngredientTable
        ingredients={ingredients}
        isLoading={list.isLoading}
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

      <Dialog
        open={activeModal?.mode === "add" || activeModal?.mode === "edit"}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[calc(100dvh-24px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {activeModal?.mode === "edit" ? "Edit Ingredient" : "Add Ingredient"}
            </DialogTitle>
          </DialogHeader>
          {activeModal?.mode === "add" || activeModal?.mode === "edit" ? (
            <IngredientForm
              initialData={activeModal.mode === "edit" ? activeModal.item : undefined}
              existingNames={existingNames}
              onSubmit={activeModal.mode === "edit" ? handleEdit : handleCreate}
              isLoading={create.isPending || update.isPending}
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
        <DialogContent className="sm:max-w-3xl max-h-[calc(100dvh-24px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ingredient Details</DialogTitle>
          </DialogHeader>
          {activeModal?.mode === "view" ? (
            <IngredientDetail
              ingredient={activeModal.item}
              canEdit={canModify}
              onEdit={() => setActiveModal({ mode: "edit", item: activeModal.item })}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
