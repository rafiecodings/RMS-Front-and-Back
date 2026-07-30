"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const segmentLabels: Record<string, string> = {
  dashboard: "Dashboard",
  customers: "Customers",
  tables: "Tables",
  reservations: "Reservations",
  menu: "Menu",
  categories: "Categories",
  items: "Items",
  orders: "Orders",
  kitchen: "Kitchen",
  pos: "POS",
  inventory: "Inventory",
  ingredients: "Ingredients",
  recipes: "Recipes",
  suppliers: "Suppliers",
  "purchase-orders": "Purchase Orders",
  staff: "Staff",
  reports: "Reports",
  settings: "Settings",
  profile: "Profile",
};

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0 || segments[0] === "dashboard") return null;

  const items = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const label =
      segmentLabels[segment] ||
      segment.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    const isLast = index === segments.length - 1;

    return { label, href, isLast };
  });

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <Link
        href="/dashboard"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((item) => (
        <span key={item.href} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 shrink-0" />
          {item.isLast ? (
            <span className="text-foreground font-medium">{item.label}</span>
          ) : (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
