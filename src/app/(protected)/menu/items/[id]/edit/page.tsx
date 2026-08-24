"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader, LoadingSpinner } from "@/components/shared";
import { MenuItemForm } from "@/features/menu";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useMenuCategories, useMenuItems } from "@/lib/hooks";
import { toast } from "sonner";
import type { MenuItemFormData } from "@/lib/types";

export default function EditMenuItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const categories = useMenuCategories();
  const { list, update } = useMenuItems();

  const categoryList = categories.list.data ?? [];
  const items = list.data?.data?.data ?? [];
  const item = items.find((i) => i.id === id);

  function handleSubmit(data: MenuItemFormData) {
    update.mutate(
      { id, data },
      {
        onSuccess: () => {
          toast.success("Menu item updated successfully");
          router.push(`/menu/items/${id}`);
        },
        onError: () => {
          toast.error("Failed to update menu item");
        },
      }
    );
  }

  if (list.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!item) {
    return (
      <div>
        <PageHeader
          title="Item Not Found"
          description="The menu item you're trying to edit doesn't exist."
          action={
            <Button variant="outline" size="sm" render={<Link href="/menu/items" />}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Menu
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Edit Menu Item"
        description={`Editing ${item.name}`}
         action={
          <Button variant="outline" size="sm" render={<Link href="/menu/items" />}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Menu Items
          </Button>
        }
      />
      <div className="rounded-lg border bg-card p-6 shadow-sm max-w-2xl">
        {categories.list.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading categories...</p>
        ) : (
          <MenuItemForm
            initialData={item}
            categories={categoryList}
            onSubmit={handleSubmit}
            isLoading={update.isPending}
            submitLabel="Update Item"
          />
        )}
      </div>
    </div>
  );
}
