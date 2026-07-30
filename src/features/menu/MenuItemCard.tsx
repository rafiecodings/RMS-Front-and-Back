"use client";

/* eslint-disable @next/next/no-img-element -- backend API images; next/image requires remotePatterns config */

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageOff } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { MenuItem } from "@/lib/types";

interface MenuItemCardProps {
  item: MenuItem;
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  return (
    <Link href={`/menu/items/${item.id}`}>
      <Card className="hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer group">
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl bg-muted">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ImageOff className="h-8 w-8 text-muted-foreground/50" />
            </div>
          )}
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
          <div className="flex items-center gap-1 mt-2">
            {item.is_vegetarian && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                Vegetarian
              </Badge>
            )}
            {item.is_vegan && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                Vegan
              </Badge>
            )}
            {item.is_gluten_free && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                Gluten Free
              </Badge>
            )}
            {item.preparation_time && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                ~{item.preparation_time}min
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
