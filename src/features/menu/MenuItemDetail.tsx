"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MenuItemImage } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  DollarSign,
} from "lucide-react";
import type { MenuItem } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

export function MenuItemDetail({
  item,
  canEdit,
  onEdit,
}: {
  item: MenuItem;
  canEdit?: boolean;
  onEdit?: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="relative h-24 w-32 sm:h-28 sm:w-40 rounded-xl bg-muted overflow-hidden shrink-0">
            <MenuItemImage src={item.image_url} alt={item.name} sizes="160px" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{item.name}</h2>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  item.is_available
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                )}
              >
                {item.is_available ? "Available" : "Unavailable"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {item.category?.name ?? "Uncategorized"}
            </p>
          </div>
        </div>
        {canEdit && onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1.5" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Item Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {item.description && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{item.description}</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                  <span className="text-emerald-600 font-bold text-sm">₱</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="text-lg font-bold">{formatCurrency(item.price)}</p>
                </div>
              </div>

              {item.image_url && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Image</p>
                    <p className="text-sm font-medium text-muted-foreground">Uploaded</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
