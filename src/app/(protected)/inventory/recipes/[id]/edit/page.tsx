"use client";

import { useParams, useRouter } from "next/navigation";
import { FormPageSkeleton, PageHeader, EmptyState } from "@/components/shared";
import { RecipeForm } from "@/features/inventory";
import { useRecipes, useRecipe } from "@/lib/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { canManageRecipes } from "@/lib/utils/permissions";
import { toast } from "sonner";
import type { RecipeFormData } from "@/lib/types";
import { ShieldX, BookOpen } from "lucide-react";

export default function EditRecipePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuth();

  const { data: recipe, isLoading } = useRecipe(id);
  const { update } = useRecipes();

  if (!canManageRecipes(user?.role)) {
    return (
      <EmptyState
        title="Not authorized"
        icon={<ShieldX className="h-8 w-8" />}
        description="Only managers and admins can edit recipes."
      />
    );
  }

  if (isLoading) {
    return (
      <FormPageSkeleton />
    );
  }

  if (!recipe) {
    return (
      <EmptyState
        title="Recipe not found"
        icon={<BookOpen className="h-8 w-8" />}
        description="This recipe may have been deleted."
      />
    );
  }

  const initialData: RecipeFormData = {
    menu_item_id: recipe.menu_item_id,
    instructions: recipe.instructions ?? "",
    yield_quantity: recipe.yield_quantity ?? 1,
    yield_unit: recipe.yield_unit ?? "serving",
    ingredients: recipe.ingredients.map((i) => ({
      ingredient_id: i.ingredient_id,
      quantity: i.quantity,
      unit: i.unit,
    })),
  };

  function handleSubmit(data: RecipeFormData) {
    update.mutate(
      { id, data },
      {
        onSuccess: () => {
          toast.success("Recipe updated successfully");
          router.push(`/inventory/recipes/${id}`);
        },
        onError: (error: Error) => {
          toast.error(error.message || "Failed to update recipe");
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Recipe`}
        description={recipe.menu_item_name ?? "Update recipe"}
      />
      <RecipeForm
        initialData={initialData}
        onSubmit={handleSubmit}
        isLoading={update.isPending}
      />
    </div>
  );
}
