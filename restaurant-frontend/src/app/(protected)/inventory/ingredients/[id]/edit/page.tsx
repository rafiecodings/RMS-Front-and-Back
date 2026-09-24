"use client";

import { useParams, useRouter } from "next/navigation";
import { FormPageSkeleton, PageHeader, EmptyState } from "@/components/shared";
import { IngredientForm } from "@/features/inventory";
import { useIngredients } from "@/lib/hooks";
import { toast } from "sonner";
import type { IngredientFormData } from "@/lib/types";
import { PackageX } from "lucide-react";

export default function EditIngredientPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { list, update } = useIngredients({ per_page: 200 });
  const ingredients = list.data?.data?.data ?? [];
  const ingredient = ingredients.find((i) => i.id === id);

  if (list.isLoading) {
    return (
      <FormPageSkeleton />
    );
  }

  if (!ingredient) {
    return (
      <EmptyState
        title="Ingredient not found"
        icon={<PackageX className="h-8 w-8" />}
        description="This ingredient may have been deleted."
      />
    );
  }

  function handleSubmit(data: IngredientFormData) {
    update.mutate(
      { id, data },
      {
        onSuccess: () => {
          toast.success("Ingredient updated successfully");
          router.push(`/inventory/ingredients/${id}`);
        },
        onError: (error: Error) => {
          toast.error(error.message || "Failed to update ingredient");
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${ingredient.name}`}
        description="Update ingredient details"
      />
      <IngredientForm
        initialData={ingredient}
        onSubmit={handleSubmit}
        isLoading={update.isPending}
        existingNames={ingredients
          .filter((i) => i.id !== id)
          .map((i) => i.name)}
      />
    </div>
  );
}
