"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared";
import { Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import type { MenuCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CategoryListProps {
  categories: MenuCategory[];
  isLoading?: boolean;
  onEdit?: (category: MenuCategory) => void;
  onDelete?: (category: MenuCategory) => void;
  onToggleActive?: (category: MenuCategory) => void;
}

export function CategoryList({
  categories,
  isLoading,
  onEdit,
  onDelete,
  onToggleActive,
}: CategoryListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">No categories yet</p>
      </div>
    );
  }

  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sorted.map((cat) => (
        <Card
          key={cat.id}
          size="sm"
          className={cn(
            "border-l-4",
            cat.is_active
              ? "border-l-emerald-500"
              : "border-l-slate-300 dark:border-l-slate-600"
          )}
        >
          <CardHeader>
            <CardTitle className="truncate" title={cat.name}>
              {cat.name}
            </CardTitle>
            <CardDescription className="truncate" title={cat.description}>
              {cat.description || "No description"}
            </CardDescription>
            <CardAction>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  cat.is_active
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300"
                )}
              >
                {cat.is_active ? "Active" : "Archived"}
              </Badge>
            </CardAction>
          </CardHeader>

          <CardContent className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {cat.items_count} {cat.items_count === 1 ? "item" : "items"}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              Order #{cat.sort_order}
            </span>
          </CardContent>

          <CardFooter className="justify-between">
            <div className="flex items-center gap-1">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(cat)}>
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Edit
                </Button>
              )}
              {onToggleActive && (
                <Button variant="ghost" size="sm" onClick={() => onToggleActive(cat)}>
                  {cat.is_active ? (
                    <>
                      <Archive className="h-4 w-4 mr-1.5" />
                      Archive
                    </>
                  ) : (
                    <>
                      <ArchiveRestore className="h-4 w-4 mr-1.5" />
                      Activate
                    </>
                  )}
                </Button>
              )}
            </div>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDelete(cat)}
                className="text-destructive"
                aria-label={`Delete ${cat.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
