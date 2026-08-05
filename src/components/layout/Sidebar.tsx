"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  Menu,
  ChevronLeft,
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

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    items: [
      { label: "Customers", href: "/customers", icon: Users },
      { label: "Tables", href: "/tables", icon: Grid3X3 },
      { label: "Reservations", href: "/reservations", icon: Calendar },
      { label: "Orders", href: "/orders", icon: ClipboardList },
      { label: "Kitchen", href: "/kitchen", icon: ChefHat },
      { label: "POS", href: "/pos", icon: CreditCard },
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
      { label: "Ingredients", href: "/inventory/ingredients", icon: Package, roles: ADMIN_ROLES },
      { label: "Recipes", href: "/inventory/recipes", icon: ClipboardCheck, roles: ADMIN_ROLES },
      { label: "Suppliers", href: "/inventory/suppliers", icon: Truck, roles: ADMIN_ROLES },
      {
        label: "Purchase Orders",
        href: "/inventory/purchase-orders",
        icon: FileBarChart,
        roles: ADMIN_ROLES,
      },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Staff", href: "/staff", icon: UserCog, roles: ADMIN_ROLES },
      { label: "Reports", href: "/reports", icon: BarChart3, roles: ADMIN_ROLES },
      { label: "Settings", href: "/settings", icon: Settings, roles: ADMIN_ROLES },
    ],
  },
];

function useFilteredNavGroups(): NavGroup[] {
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

const SIDEBAR_WIDTH = 256;
const SIDEBAR_COLLAPSED_WIDTH = 68;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
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
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
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

function SidebarLogo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b px-4 py-5",
        collapsed && "justify-center px-0"
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
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

function CollapsedNavLinks() {
  const pathname = usePathname();
  const filteredNavGroups = useFilteredNavGroups();

  return (
    <nav className="flex-1 overflow-y-auto py-4">
      {filteredNavGroups.map((group) =>
        group.items.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "mx-2 mb-1 flex items-center justify-center rounded-xl py-2.5 transition-all duration-150",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })
      )}
    </nav>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className="hidden lg:flex lg:flex-col border-r bg-card transition-[width] duration-200 ease-in-out"
      style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
    >
      <SidebarLogo collapsed={collapsed} />

      {collapsed ? (
        <CollapsedNavLinks />
      ) : (
        <NavLinks />
      )}

      <div className="border-t p-3">
        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
            collapsed && "px-0"
          )}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              collapsed && "rotate-180"
            )}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          />
        }
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open navigation</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarLogo />
        <NavLinks onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
