"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { RecipeTable } from "@/features/inventory";
import { useRecipes } from "@/lib/hooks";
import { Plus } from "lucide-react";

export default function RecipesPage() {
  const [page, setPage] = useState(1);

  const { list } = useRecipes({
    page,
    per_page: 20,
  });

  const recipes = list.data?.data?.data ?? [];
  const totalPages = list.data?.data?.meta?.last_page ?? 1;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Recipes"
        description="Map menu items to their ingredient lists and quantities"
        action={
          <Button render={<Link href="/inventory/recipes/new" />}>
            <Plus className="h-4 w-4 mr-1" />
            Add Recipe
          </Button>
        }
      />

      <RecipeTable
        recipes={recipes}
        isLoading={list.isLoading}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
