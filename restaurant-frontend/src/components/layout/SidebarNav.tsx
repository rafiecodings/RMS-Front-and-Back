"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Grid3X3,
  Calendar,
  UtensilsCrossed,
  ClipboardList,
  ChefHat,
  CreditCard,
  Package,
  BarChart3,
  Settings,
  UserCog,
  Store,
  ShoppingBag,
  Truck,
  ClipboardCheck,
  FileBarChart,
  type LucideIcon,
} from "lucide-react";
import { SIDEBAR_ROLES } from "@/lib/utils/permissions";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: SIDEBAR_ROLES.dashboard }],
  },
  {
    label: "Operations",
    items: [
      { label: "Customers", href: "/customers", icon: Users, roles: SIDEBAR_ROLES.customers },
      { label: "Tables", href: "/tables", icon: Grid3X3, roles: SIDEBAR_ROLES.tables },
      { label: "Reservations", href: "/reservations", icon: Calendar, roles: SIDEBAR_ROLES.reservations },
      { label: "Orders", href: "/orders", icon: ClipboardList, roles: SIDEBAR_ROLES.orders },
      { label: "Kitchen", href: "/kitchen", icon: ChefHat, roles: SIDEBAR_ROLES.kitchen },
      { label: "POS", href: "/pos", icon: CreditCard, roles: SIDEBAR_ROLES.pos },
    ],
  },
  {
    label: "Menu",
    items: [
      { label: "Categories", href: "/menu/categories", icon: ShoppingBag, roles: SIDEBAR_ROLES.staff },
      { label: "Items", href: "/menu/items", icon: UtensilsCrossed, roles: SIDEBAR_ROLES.staff },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Ingredients", href: "/inventory/ingredients", icon: Package, roles: SIDEBAR_ROLES.inventory },
      { label: "Recipes", href: "/inventory/recipes", icon: ClipboardCheck, roles: SIDEBAR_ROLES.inventory },
      { label: "Suppliers", href: "/inventory/suppliers", icon: Truck, roles: SIDEBAR_ROLES.inventory },
      {
        label: "Purchase Orders",
        href: "/inventory/purchase-orders",
        icon: FileBarChart,
        roles: SIDEBAR_ROLES.inventory,
      },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Staff", href: "/staff", icon: UserCog, roles: SIDEBAR_ROLES.staff },
      { label: "Reports & Analytics", href: "/reports", icon: BarChart3, roles: SIDEBAR_ROLES.reports },
      { label: "Settings", href: "/settings", icon: Settings, roles: SIDEBAR_ROLES.settings },
    ],
  },
];

export function useFilteredNavGroups(): NavGroup[] {
  const { user } = useAuth();
  const role = user?.role ?? "user";
  return useMemo(() => {
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) => !item.roles || item.roles.includes(role)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [role]);
}


export function SidebarLogo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b px-4 py-5",
        collapsed && "justify-center px-0"
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
      <Store className="h-5 w-5" />
    </div>
      {!collapsed && (
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight">RMS</span>
          <span className="text-[10px] text-muted-foreground">
            Restaurant Management
          </span>
        </div>
      )}
    </div>
  );
}

const SIDEBAR_COLLAPSED_KEY = "rms.sidebar.collapsed";

export function useSidebarCollapsed() {
  // Lazy init from localStorage (client-only component tree).
  const [collapsed, setCollapsed] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1"
  );

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  return { collapsed, toggle };
}

export function NavLinks({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const filteredNavGroups = useFilteredNavGroups();

  if (collapsed) {
    // Icon-only rail with hover tooltips.
    const flat = filteredNavGroups.flatMap((g) => g.items);
    return (
      <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-4">
        {flat.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              onClick={onNavigate}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-150",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex-1 overflow-y-auto py-4">
      {filteredNavGroups.map((group, groupIndex) => (
        <div key={group.label} className={cn(groupIndex > 0 && "mt-6")}>
          <p className="px-4 mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            {group.label}
          </p>
          <ul className="space-y-0.5 px-2">
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                      isActive
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5 shrink-0",
                      isActive ? "text-primary" : ""
                    )} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}