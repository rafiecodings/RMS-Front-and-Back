"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { RecipeForm } from "@/features/inventory";
import { useRecipes } from "@/lib/hooks";
import { toast } from "sonner";
import type { RecipeFormData } from "@/lib/types";

export default function NewRecipePage() {
  const router = useRouter();
  const { create } = useRecipes();

  function handleSubmit(data: RecipeFormData) {
    create.mutate(data, {
      onSuccess: () => {
        toast.success("Recipe created successfully");
        router.push("/inventory/recipes");
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to create recipe");
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Recipe"
        description="Map a menu item to its ingredient list"
      />
      <RecipeForm onSubmit={handleSubmit} isLoading={create.isPending} />
    </div>
  );
}
