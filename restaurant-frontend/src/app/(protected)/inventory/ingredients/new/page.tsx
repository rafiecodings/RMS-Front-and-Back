"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { IngredientForm } from "@/features/inventory";
import { useIngredients } from "@/lib/hooks";
import { toast } from "sonner";
import type { IngredientFormData } from "@/lib/types";

export default function NewIngredientPage() {
  const router = useRouter();
  const { create, list } = useIngredients({ per_page: 200 });

  const existingNames = (list.data?.data?.data ?? []).map((i) => i.name);

  function handleSubmit(data: IngredientFormData) {
    create.mutate(data, {
      onSuccess: () => {
        toast.success("Ingredient created successfully");
        router.push("/inventory/ingredients");
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to create ingredient");
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Ingredient"
        description="Add a new ingredient to your inventory"
      />
      <IngredientForm
        onSubmit={handleSubmit}
        isLoading={create.isPending}
        existingNames={existingNames}
      />
    </div>
  );
}
