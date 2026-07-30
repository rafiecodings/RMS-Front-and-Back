"use client";

import { useParams } from "next/navigation";
import { EmptyState, LoadingSpinner } from "@/components/shared";
import { RecipeDetail } from "@/features/inventory";
import { useRecipe } from "@/lib/hooks";

export default function RecipeDetailPage() {
  const params = useParams();
  const id = params.id as string;

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
    <div className="space-y-6">
      <RecipeDetail recipe={recipe} />
    </div>
  );
}
