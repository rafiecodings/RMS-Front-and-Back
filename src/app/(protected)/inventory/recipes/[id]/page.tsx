"use client";

import { use } from "react";
import { EmptyState, LoadingSpinner } from "@/components/shared";
import { RecipeDetail } from "@/features/inventory";
import { useRecipe } from "@/lib/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { canManageRecipes } from "@/lib/utils/permissions";

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data: recipe, isLoading } = useRecipe(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <EmptyState
        title="Recipe not found"
        description="This recipe may have been deleted."
      />
    );
  }

  return (
    <RecipeDetail
      recipe={recipe}
      canEdit={canManageRecipes(user?.role)}
    />
  );
}
