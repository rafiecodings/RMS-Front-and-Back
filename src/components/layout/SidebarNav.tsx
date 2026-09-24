"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Armchair,
  Calendar,
  UtensilsCrossed,
  ReceiptText,
  ChefHat,
  CreditCard,
  BarChart3,
  Settings,
  UserCog,
  Store,
  ShoppingCart,
  BadgePercent,
  LayoutGrid,
  BookOpen,
  Warehouse,
  PackageSearch,
  PackagePlus,
  BriefcaseBusiness,
  SquareMenu,
  Boxes,
  ChartPie,
  ScrollText,
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
      { label: "Tables", href: "/tables", icon: Armchair, roles: SIDEBAR_ROLES.tables },
      { label: "Reservations", href: "/reservations", icon: Calendar, roles: SIDEBAR_ROLES.reservations },
      { label: "Orders", href: "/orders", icon: ReceiptText, roles: SIDEBAR_ROLES.orders },
      { label: "Kitchen", href: "/kitchen", icon: ChefHat, roles: SIDEBAR_ROLES.kitchen },
      { label: "POS", href: "/pos", icon: CreditCard, roles: SIDEBAR_ROLES.pos },
    ],
  },
  {
    label: "Menu",
    items: [
      { label: "Categories", href: "/menu/categories", icon: LayoutGrid, roles: SIDEBAR_ROLES.staff },
      { label: "Items", href: "/menu/items", icon: UtensilsCrossed, roles: SIDEBAR_ROLES.staff },
      { label: "Promotions & Discounts", href: "/menu/promotions", icon: BadgePercent, roles: SIDEBAR_ROLES.staff },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Ingredients", href: "/inventory/ingredients", icon: Boxes, roles: SIDEBAR_ROLES.inventory },
      { label: "Recipes", href: "/inventory/recipes", icon: BookOpen, roles: SIDEBAR_ROLES.inventory },
      { label: "Inventory Monitoring", href: "/inventory", icon: PackageSearch, roles: SIDEBAR_ROLES.inventory },
      { label: "Replenishment Requests", href: "/inventory/replenishment", icon: PackagePlus, roles: SIDEBAR_ROLES.inventory },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Staff", href: "/staff", icon: BriefcaseBusiness, roles: SIDEBAR_ROLES.staff },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Revenue", href: "/reports/revenue", icon: BarChart3, roles: SIDEBAR_ROLES.reports },
      { label: "Sales", href: "/reports/sales", icon: ShoppingCart, roles: SIDEBAR_ROLES.reports },
      { label: "Menu", href: "/reports/menu", icon: SquareMenu, roles: SIDEBAR_ROLES.reports },
      { label: "Inventory", href: "/reports/inventory", icon: Warehouse, roles: SIDEBAR_ROLES.reports },
      { label: "Forecasting / Analytics", href: "/analytics", icon: ChartPie, roles: SIDEBAR_ROLES.reports },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Restaurant Settings", href: "/settings/restaurant", icon: Settings, roles: SIDEBAR_ROLES.settings },
      { label: "Users & Roles", href: "/settings/users", icon: UserCog, roles: SIDEBAR_ROLES.settings },
      { label: "Audit Logs", href: "/settings/audit-logs", icon: ScrollText, roles: SIDEBAR_ROLES.settings },
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

/**
 * Only the most specific matching route is active. Prevents broad prefixes
 * (e.g. "/inventory") from highlighting alongside exact child routes
 * (e.g. "/inventory/replenishment"), which made adjacent items share one
 * continuous highlighted block.
 */
function computeActiveHrefs(pathname: string, hrefs: string[]): Set<string> {
  let best: string | null = null;
  for (const href of hrefs) {
    const matches = pathname === href || pathname.startsWith(href + "/");
    if (!matches) continue;
    if (best === null || href.length > best.length) best = href;
  }
  return new Set(best === null ? [] : [best]);
}

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
  scrollRef,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const pathname = usePathname();
  const filteredNavGroups = useFilteredNavGroups();
  const activeHrefs = useMemo(
    () =>
      computeActiveHrefs(
        pathname,
        filteredNavGroups.flatMap((g) => g.items.map((i) => i.href)),
      ),
    [pathname, filteredNavGroups],
  );

  if (collapsed) {
    // Icon-only rail with hover tooltips.
    const flat = filteredNavGroups.flatMap((g) => g.items);
    return (
      <nav ref={scrollRef} className="flex flex-1 flex-col items-center gap-1 overflow-y-auto overscroll-contain py-4">
        {flat.map((item) => {
          const isActive = activeHrefs.has(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              onClick={onNavigate}
              data-active={isActive ? "true" : undefined}
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
    <nav ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain py-4">
      {filteredNavGroups.map((group, groupIndex) => (
        <div key={group.label} className={cn(groupIndex > 0 && "mt-6")}>
          <p className="px-4 mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            {group.label}
          </p>
          <ul className="space-y-0.5 px-2">
            {group.items.map((item) => {
              const isActive = activeHrefs.has(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    data-active={isActive ? "true" : undefined}
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
