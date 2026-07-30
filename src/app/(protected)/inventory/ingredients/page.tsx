"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { IngredientTable } from "@/features/inventory";
import { useIngredients } from "@/lib/hooks";
import { Plus } from "lucide-react";

export default function IngredientsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { list } = useIngredients({
    page,
    per_page: 20,
    search: search || undefined,
    category: categoryFilter === "all" ? undefined : categoryFilter,
  });

  const ingredients = list.data?.data?.data ?? [];
  const totalPages = list.data?.data?.meta?.last_page ?? 1;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ingredients"
        description="Manage your ingredient catalog and stock levels"
        action={
          <Button render={<Link href="/inventory/ingredients/new" />}>
            <Plus className="h-4 w-4 mr-1" />
            Add Ingredient
          </Button>
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
      />
    </div>
  );
}
