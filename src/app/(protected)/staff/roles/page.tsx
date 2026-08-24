"use client";

import { PageHeader } from "@/components/shared";
import { RoleBadge } from "@/features/staff";
import { STAFF_ROLES, STAFF_SHIFTS } from "@/lib/types";
import { useStaffShifts } from "@/lib/hooks";
import { Shield, Clock } from "lucide-react";

// Reflects the actual RMS roles and their staff-area capabilities,
// matching PERMISSION_MATRIX and the backend route middleware.
const PERMISSION_ROWS = [
  { role: "admin", orders: "All", pos: "All", inventory: "All", staff: "Full", reports: "All" },
  { role: "manager", orders: "All", pos: "View", inventory: "All", staff: "Full", reports: "All" },
  { role: "cashier", orders: "View", pos: "Process", inventory: "None", staff: "None", reports: "Revenue" },
  { role: "waiter", orders: "Edit", pos: "None", inventory: "None", staff: "None", reports: "None" },
  { role: "kitchen_staff", orders: "View", pos: "None", inventory: "View", staff: "None", reports: "None" },
  { role: "inventory_staff", orders: "None", pos: "None", inventory: "All", staff: "None", reports: "None" },
] as const;

export default function RolesPage() {
  const { data: backendShifts } = useStaffShifts();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="View staff roles and their access levels"
      />

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Staff Roles</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {STAFF_ROLES.map((r) => (
            <div key={r.value} className="flex items-center gap-3 rounded-lg border p-3">
              <RoleBadge role={r.value} />
              <span className="text-sm text-muted-foreground capitalize">
                {r.value.replace(/_/g, " ")}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Shift Definitions</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {(backendShifts && backendShifts.length > 0
            ? backendShifts.map((s) => ({
                id: s.id,
                label: s.name,
                time: `${s.start_time} – ${s.end_time}`,
              }))
            : STAFF_SHIFTS.map((s) => ({
                id: s.value,
                label: s.label,
                time: s.time,
              }))
          ).map((s) => (
            <div key={s.id} className="rounded-lg border p-3">
              <p className="font-medium">{s.label}</p>
              <p className="text-sm text-muted-foreground">{s.time}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Shift definitions are managed in the system seed data.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Permission Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b">
                <th className="text-left px-3 py-2 font-medium">Role</th>
                <th className="text-center px-3 py-2 font-medium">Orders</th>
                <th className="text-center px-3 py-2 font-medium">POS</th>
                <th className="text-center px-3 py-2 font-medium">Inventory</th>
                <th className="text-center px-3 py-2 font-medium">Staff</th>
                <th className="text-center px-3 py-2 font-medium">Reports</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {PERMISSION_ROWS.map((row) => (
                <tr key={row.role} className="hover:bg-muted/30">
                  <td className="px-3 py-2"><RoleBadge role={row.role} /></td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{row.orders}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{row.pos}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{row.inventory}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{row.staff}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{row.reports}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          The backend API remains the authoritative enforcer of these permissions.
        </p>
      </div>
    </div>
  );
}
