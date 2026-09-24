"use client";

import { use } from "react";
import Link from "next/link";
import { DetailPageSkeleton, PageHeader } from "@/components/shared";
import { MenuItemDetail } from "@/features/menu";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useMenuItems } from "@/lib/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { canEdit } from "@/lib/utils/permissions";

export default function MenuItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { list } = useMenuItems();
  const { user } = useAuth();
  const canEditMenu = canEdit(user?.role, "menu");

  const items = list.data?.data?.data ?? [];
  const item = items.find((i) => i.id === id);

  if (list.isLoading) {
    return (
      <DetailPageSkeleton />
    );
  }

  if (!item) {
    return (
      <div>
        <PageHeader
          title="Item Not Found"
          description="The menu item you're looking for doesn't exist."
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
        title="Menu Item Details"
        action={
          <Button variant="outline" size="sm" render={<Link href="/menu/items" />}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        }
      />
      <MenuItemDetail item={item} canEdit={canEditMenu} />
    </div>
  );
}
