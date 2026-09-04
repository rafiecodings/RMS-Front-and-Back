"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { LoadingSpinner, MenuItemImage } from "@/components/shared";
import { EntityActionDropdown } from "@/components/shared";
import type { MenuItem } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

interface MenuItemListProps {
  items: MenuItem[];
  isLoading?: boolean;
  onView?: (item: MenuItem) => void;
  onEdit?: (item: MenuItem) => void;
  onDelete?: (item: MenuItem) => void;
  onToggleAvailability?: (item: MenuItem) => void;
  canEditItem?: boolean;
}

export function MenuItemList({
  items,
  isLoading,
  onView,
  onEdit,
  onDelete,
  onToggleAvailability,
  canEditItem,
}: MenuItemListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">No menu items found</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <MenuItemImage
                        src={item.image_url}
                        alt={item.name}
                        sizes="44px"
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => onView?.(item)}
                        className="font-medium hover:underline text-left"
                      >
                        {item.name}
                      </button>
                      {item.description && (
                        <p className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {item.category?.name ?? "—"}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(item.price)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
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
                    {onToggleAvailability && (
                      <Switch
                        checked={item.is_available}
                        onCheckedChange={() => onToggleAvailability(item)}
                        aria-label={`Toggle availability for ${item.name}`}
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <EntityActionDropdown
                    onView={onView ? () => onView(item) : undefined}
                    viewLabel="View"
                    onEdit={canEditItem && onEdit ? () => onEdit(item) : undefined}
                    editLabel="Edit"
                    onAction={onDelete ? () => onDelete(item) : undefined}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border bg-card p-4 overflow-hidden"
          >
            <div className="flex gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                <MenuItemImage
                  src={item.image_url}
                  alt={item.name}
                  sizes="56px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onView?.(item)}
                    className="font-medium text-sm truncate text-left hover:underline min-w-0 flex-1"
                  >
                    {item.name}
                  </button>
                  <div className="shrink-0 -mr-2 -mt-1 min-h-10 min-w-10 flex items-center justify-center">
                    <EntityActionDropdown
                      onView={onView ? () => onView(item) : undefined}
                      viewLabel="View"
                      onEdit={canEditItem && onEdit ? () => onEdit(item) : undefined}
                      editLabel="Edit"
                      onAction={onDelete ? () => onDelete(item) : undefined}
                    />
                  </div>
                </div>
                {item.description ? (
                  <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                    {item.description}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground truncate">
                    {item.category?.name ?? "—"}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm font-bold shrink-0">
                    {formatCurrency(item.price)}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] px-1.5 py-0 shrink-0",
                      item.is_available
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    )}
                  >
                    {item.is_available ? "Available" : "Unavailable"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">
                  {item.category?.name ?? "Uncategorized"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {item.is_available ? "Available" : "Unavailable"}
                </p>
              </div>
              {onToggleAvailability ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium">Status</span>
                  <Switch
                    checked={item.is_available}
                    onCheckedChange={() => onToggleAvailability(item)}
                    aria-label={`Toggle availability for ${item.name}`}
                    className="min-h-5 min-w-8"
                  />
                </div>
              ) : (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] shrink-0",
                    item.is_available
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                  )}
                >
                  {item.is_available ? "Available" : "Unavailable"}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
