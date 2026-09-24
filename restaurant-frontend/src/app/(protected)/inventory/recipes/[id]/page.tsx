"use client";

import { use } from "react";
import { DetailPageSkeleton, EmptyState } from "@/components/shared";
import { RecipeDetail } from "@/features/inventory";
import { useRecipe } from "@/lib/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { canManageRecipes } from "@/lib/utils/permissions";
import { BookOpen } from "lucide-react";

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
      <DetailPageSkeleton />
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

  return (
    <RecipeDetail
      recipe={recipe}
      canEdit={canManageRecipes(user?.role)}
    />
  );
}
