"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared";
import { EntityActionDropdown } from "@/components/shared";
import { ImageOff } from "lucide-react";
import type { MenuItem } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

interface MenuItemListProps {
  items: MenuItem[];
  isLoading?: boolean;
  onDelete?: (item: MenuItem) => void;
}

export function MenuItemList({ items, isLoading, onDelete }: MenuItemListProps) {
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
            <TableHead className="hidden lg:table-cell text-center">
              Prep Time
            </TableHead>
            <TableHead className="hidden lg:table-cell text-center">
              Dietary
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  {item.image_url ? (
                    <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element -- backend API images; next/image requires remotePatterns config */}
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <ImageOff className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <Link
                      href={`/menu/items/${item.id}`}
                      className="font-medium hover:underline"
                    >
                      {item.name}
                    </Link>
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
              <TableCell className="hidden lg:table-cell text-center text-muted-foreground">
                {item.preparation_time ? `${item.preparation_time}m` : "—"}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="flex items-center justify-center gap-1">
                  {item.is_vegetarian && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      V
                    </Badge>
                  )}
                  {item.is_vegan && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      VG
                    </Badge>
                  )}
                  {item.is_gluten_free && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      GF
                    </Badge>
                  )}
                  {!item.is_vegetarian && !item.is_vegan && !item.is_gluten_free && (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell>
                <EntityActionDropdown
                  viewHref={`/menu/items/${item.id}`}
                  viewLabel="View"
                  editHref={`/menu/items/${item.id}/edit`}
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
