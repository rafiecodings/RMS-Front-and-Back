"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared";
import { MenuItemForm } from "@/features/menu";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useMenuCategories, useMenuItems } from "@/lib/hooks";
import { toast } from "sonner";
import type { MenuItemFormData } from "@/lib/types";

export default function NewMenuItemPage() {
  const router = useRouter();
  const categories = useMenuCategories();
  const { create } = useMenuItems();

  const categoryList = categories.list.data ?? [];

  function handleSubmit(data: MenuItemFormData) {
    create.mutate(data, {
      onSuccess: () => {
        toast.success("Menu item created successfully");
        router.push("/menu/items");
      },
      onError: () => {
        toast.error("Failed to create menu item");
      },
    });
  }

  return (
    <div>
      <PageHeader
        title="Add Menu Item"
        description="Create a new menu item"
        action={
          <Button variant="outline" size="sm" render={<Link href="/menu/items" />}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        }
      />
      <div className="rounded-lg border bg-card p-6 shadow-sm max-w-2xl">
        {categories.list.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading categories...</p>
        ) : (
          <MenuItemForm
            categories={categoryList}
            onSubmit={handleSubmit}
            isLoading={create.isPending}
            submitLabel="Create Item"
          />
        )}
      </div>
    </div>
  );
}
