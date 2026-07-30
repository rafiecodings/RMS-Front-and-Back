"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Pencil,
  Clock,
  Flame,
  Tag,
  AlertTriangle,
  MapPin,
  ImageOff,
  DollarSign,
} from "lucide-react";
import type { MenuItem } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

export function MenuItemDetail({ item }: { item: MenuItem }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {item.image_url ? (
            <div className="h-20 w-20 rounded-xl bg-muted overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- backend API images; next/image requires remotePatterns config */}
              <img
                src={item.image_url}
                alt={item.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <ImageOff className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
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
        <Button variant="outline" size="sm" render={<Link href={`/menu/items/${item.id}/edit`} />}>
          <Pencil className="h-4 w-4 mr-1.5" />
          Edit
        </Button>
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

              {item.cost_price !== undefined && item.cost_price !== null && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cost Price</p>
                    <p className="text-sm font-medium">{formatCurrency(item.cost_price)}</p>
                  </div>
                </div>
              )}

              {item.preparation_time && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Prep Time</p>
                    <p className="text-sm font-medium">{item.preparation_time} minutes</p>
                  </div>
                </div>
              )}

              {item.calories && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Flame className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Calories</p>
                    <p className="text-sm font-medium">{item.calories} kcal</p>
                  </div>
                </div>
              )}

              {item.station && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Station</p>
                    <p className="text-sm font-medium">{item.station}</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              {item.is_vegetarian && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  Vegetarian
                </Badge>
              )}
              {item.is_vegan && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Vegan
                </Badge>
              )}
              {item.is_gluten_free && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  Gluten Free
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {item.variants && item.variants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Variants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {item.variants.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span>{v.name}</span>
                      {v.is_default && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">
                          Default
                        </Badge>
                      )}
                    </div>
                    <span className="font-medium">{formatCurrency(v.price)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {item.tags && item.tags.length > 0 && (
            <Card>
              <CardContent className="pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Tags</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {item.allergens && item.allergens.length > 0 && (
            <Card>
              <CardContent className="pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-xs text-muted-foreground font-medium">Allergens</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {item.allergens.map((a) => (
                    <Badge
                      key={a}
                      variant="secondary"
                      className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                    >
                      {a}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
