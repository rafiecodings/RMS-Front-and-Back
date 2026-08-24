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
import { RecipeTable, RecipeForm, RecipeDetail } from "@/features/inventory";
import { useRecipes } from "@/lib/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { canManageRecipes } from "@/lib/utils/permissions";
import { Plus } from "lucide-react";
import type { Recipe, RecipeFormData } from "@/lib/types";
import { toast } from "sonner";

type RecipeModal =
  | { mode: "add" }
  | { mode: "edit"; item: Recipe }
  | { mode: "view"; item: Recipe }
  | null;

function toFormData(recipe: Recipe): RecipeFormData {
  return {
    menu_item_id: recipe.menu_item_id,
    instructions: recipe.instructions ?? "",
    yield_quantity: recipe.yield_quantity ?? 1,
    yield_unit: recipe.yield_unit ?? "serving",
    ingredients: (recipe.ingredients ?? []).map((i) => ({
      ingredient_id: i.ingredient_id,
      quantity: i.quantity,
      unit: i.unit,
    })),
  };
}

export default function RecipesPage() {
  const [page, setPage] = useState(1);
  const { user } = useAuth();
  const canManage = canManageRecipes(user?.role);
  const [activeModal, setActiveModal] = useState<RecipeModal>(null);

  const { list, create, update } = useRecipes({ page, per_page: 20 });

  const recipes = list.data?.data?.data ?? [];
  const totalPages = list.data?.data?.meta?.last_page ?? 1;

  function handleCreate(data: RecipeFormData) {
    create.mutate(data, {
      onSuccess: () => {
        toast.success("Recipe created");
        setActiveModal(null);
      },
      onError: () => toast.error("Failed to create recipe"),
    });
  }

  function handleEdit(data: RecipeFormData) {
    if (activeModal?.mode !== "edit") return;
    update.mutate(
      { id: activeModal.item.id, data },
      {
        onSuccess: () => {
          toast.success("Recipe updated");
          setActiveModal(null);
        },
        onError: () => toast.error("Failed to update recipe"),
      }
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Recipes"
        description="Map menu items to their ingredient lists and quantities"
        action={
          canManage ? (
            <Button onClick={() => setActiveModal({ mode: "add" })}>
              <Plus className="h-4 w-4 mr-1" />
              Add Recipe
            </Button>
          ) : undefined
        }
      />

      <RecipeTable
        recipes={recipes}
        isLoading={list.isLoading}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        canEdit={canManage}
        onView={(item) => setActiveModal({ mode: "view", item })}
        onEdit={canManage ? (item) => setActiveModal({ mode: "edit", item }) : undefined}
      />

      <Dialog
        open={activeModal?.mode === "add" || activeModal?.mode === "edit"}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null);
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {activeModal?.mode === "edit" ? "Edit Recipe" : "Add Recipe"}
            </DialogTitle>
          </DialogHeader>
          {activeModal?.mode === "add" || activeModal?.mode === "edit" ? (
            <RecipeForm
              initialData={activeModal.mode === "edit" ? toFormData(activeModal.item) : undefined}
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
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recipe Details</DialogTitle>
          </DialogHeader>
          {activeModal?.mode === "view" ? (
            <RecipeDetail
              recipe={activeModal.item}
              canEdit={canManage}
              onEdit={() => setActiveModal({ mode: "edit", item: activeModal.item })}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
