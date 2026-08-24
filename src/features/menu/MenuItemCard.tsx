"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MenuItemImage } from "@/components/shared";
import { cn, formatCurrency } from "@/lib/utils";
import type { MenuItem } from "@/lib/types";

interface MenuItemCardProps {
  item: MenuItem;
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  return (
    <Link href={`/menu/items/${item.id}`}>
      <Card className="hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer group">
        <div
          className={cn(
            "relative aspect-[4/3] overflow-hidden rounded-t-xl bg-muted",
            item.is_available && "group-hover:[&>img]:scale-105 [&>img]:transition-transform"
          )}
        >
          <MenuItemImage src={item.image_url} alt={item.name} />
          {!item.is_available && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <Badge variant="destructive" className="text-xs">Unavailable</Badge>
            </div>
          )}
        </div>
        <CardContent className="pt-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{item.name}</h3>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
            <span className="text-sm font-bold shrink-0">
              {formatCurrency(item.price)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
