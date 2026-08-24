"use client";

import { MenuItemImage } from "@/components/shared";
import type { MenuItem } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

interface PosProductCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

export function PosProductCard({ item, onAdd }: PosProductCardProps) {
  return (
    <button
      type="button"
      onClick={() => onAdd(item)}
      disabled={!item.is_available}
      className="group relative overflow-hidden rounded-xl border bg-card text-left transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <MenuItemImage
          src={item.image_url}
          alt={item.name}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="transition-transform group-hover:scale-105"
        />
        {!item.is_available && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
              Unavailable
            </span>
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-1 p-2">
        <p className="text-sm font-medium leading-tight line-clamp-2">{item.name}</p>
        <span className="shrink-0 text-sm font-bold">{formatCurrency(item.price)}</span>
      </div>
    </button>
  );
}
