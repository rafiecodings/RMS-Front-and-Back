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
    <div className="rounded-lg border">
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
  );
}
