"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { useMenuCategories, useMenuItems } from "@/lib/hooks";
import { PosProductCard } from "./PosProductCard";
import type { MenuItem } from "@/lib/types";

interface ProductGridProps {
  onAddToCart: (item: MenuItem) => void;
}

export function ProductGrid({ onAddToCart }: ProductGridProps) {
  const [search, setSearch] = useState("");
  const { list: categoriesList } = useMenuCategories();
  const categories = categoriesList.data ?? [];

  const [selectedCategory, setSelectedCategory] = useState("all");

  const { list: itemsList } = useMenuItems({
    category_id: selectedCategory === "all" ? undefined : selectedCategory,
    is_available: true,
  });

  const allItems = itemsList.data?.data?.data ?? [];

  const filteredItems = search
    ? allItems.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      )
    : allItems;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 space-y-2 p-3 pb-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu items..."
            className="h-9 pl-8"
          />
        </div>

        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v ?? "all")}>
          <TabsList variant="line" className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {itemsList.isLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-xl border p-2">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-muted-foreground">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {filteredItems.map((item) => (
              <PosProductCard key={item.id} item={item} onAdd={onAddToCart} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
