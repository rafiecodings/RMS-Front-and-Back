"use client";

import type { StaffRole } from "@/lib/types";

const ROLE_COLORS: Record<string, string> = {
  manager: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  cashier: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  waiter: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  kitchen_staff: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  host: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
  bartender: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
};

const ROLE_LABELS: Record<string, string> = {
  manager: "Manager",
  cashier: "Cashier",
  waiter: "Waiter",
  kitchen_staff: "Kitchen Staff",
  host: "Host",
  bartender: "Bartender",
};

export function RoleBadge({ role }: { role: StaffRole }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[role] ?? "bg-gray-100 text-gray-800"}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}
