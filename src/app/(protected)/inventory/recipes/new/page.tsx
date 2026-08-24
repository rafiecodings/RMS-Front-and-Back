"use client";

import { useRouter } from "next/navigation";
import { PageHeader, EmptyState } from "@/components/shared";
import { RecipeForm } from "@/features/inventory";
import { useRecipes } from "@/lib/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { canManageRecipes } from "@/lib/utils/permissions";
import { toast } from "sonner";
import type { RecipeFormData } from "@/lib/types";

export default function NewRecipePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { create } = useRecipes();

  if (!canManageRecipes(user?.role)) {
    return (
      <EmptyState
        title="Not authorized"
        description="Only managers and admins can create recipes."
      />
    );
  }

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
      <PageHeader title="Add Recipe" description="Create a recipe mapping" />
      <RecipeForm onSubmit={handleSubmit} isLoading={create.isPending} />
    </div>
  );
}
