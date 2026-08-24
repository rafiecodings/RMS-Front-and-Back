"use client";

import type { StaffRole } from "@/lib/types";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  manager: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  inventory_staff: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  cashier: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  waiter: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  kitchen_staff: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  inventory_staff: "Inventory Staff",
  cashier: "Cashier",
  waiter: "Waiter",
  kitchen_staff: "Kitchen Staff",
};

export function RoleBadge({ role }: { role: StaffRole }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[role] ?? "bg-gray-100 text-gray-800"}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}
