"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  ShoppingCart,
  CalendarPlus,
  Package,
  Users,
  BarChart3,
  CreditCard,
} from "lucide-react";

interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const actions: QuickAction[] = [
  {
    label: "New Order",
    href: "/pos",
    icon: Plus,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    label: "POS",
    href: "/pos",
    icon: CreditCard,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    label: "Reserve Table",
    href: "/reservations",
    icon: CalendarPlus,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    label: "View Orders",
    href: "/orders",
    icon: ShoppingCart,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  {
    label: "Inventory",
    href: "/inventory/ingredients",
    icon: Package,
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  {
    label: "Staff",
    href: "/staff",
    icon: Users,
    color: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-2 rounded-lg border p-3 text-center hover:bg-muted/50 transition-colors"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${action.color}`}
              >
                <action.icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
