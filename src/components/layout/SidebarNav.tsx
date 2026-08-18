"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
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

const ADMIN_ROLES = ["admin", "manager"];
const INVENTORY_ROLES = ["admin", "manager", "inventory_staff"];
const WAITER_ROLES = ["admin", "manager", "waiter"];
const CASHIER_ROLES = ["admin", "manager", "cashier"];
const KITCHEN_ROLES = ["admin", "manager", "kitchen_staff"];

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    items: [
      { label: "Customers", href: "/customers", icon: Users, roles: [...WAITER_ROLES, ...CASHIER_ROLES] },
      { label: "Tables", href: "/tables", icon: Grid3X3, roles: WAITER_ROLES },
      { label: "Reservations", href: "/reservations", icon: Calendar, roles: [...WAITER_ROLES, ...CASHIER_ROLES] },
      { label: "Orders", href: "/orders", icon: ClipboardList, roles: [...WAITER_ROLES, ...CASHIER_ROLES, ...KITCHEN_ROLES] },
      { label: "Kitchen", href: "/kitchen", icon: ChefHat, roles: [...KITCHEN_ROLES, ...WAITER_ROLES] },
      { label: "POS", href: "/pos", icon: CreditCard, roles: [...WAITER_ROLES, ...CASHIER_ROLES] },
    ],
  },
  {
    label: "Menu",
    items: [
      { label: "Categories", href: "/menu/categories", icon: ShoppingBag, roles: ADMIN_ROLES },
      { label: "Items", href: "/menu/items", icon: UtensilsCrossed, roles: ADMIN_ROLES },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Ingredients", href: "/inventory/ingredients", icon: Package, roles: INVENTORY_ROLES },
      { label: "Recipes", href: "/inventory/recipes", icon: ClipboardCheck, roles: INVENTORY_ROLES },
      { label: "Suppliers", href: "/inventory/suppliers", icon: Truck, roles: INVENTORY_ROLES },
      {
        label: "Purchase Requests",
        href: "/inventory/purchase-orders",
        icon: FileBarChart,
        roles: INVENTORY_ROLES,
      },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Staff", href: "/staff", icon: UserCog, roles: ADMIN_ROLES },
      { label: "Reports & Analytics", href: "/reports", icon: BarChart3, roles: ADMIN_ROLES },
      { label: "Settings", href: "/settings", icon: Settings, roles: ADMIN_ROLES },
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

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const filteredNavGroups = useFilteredNavGroups();

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