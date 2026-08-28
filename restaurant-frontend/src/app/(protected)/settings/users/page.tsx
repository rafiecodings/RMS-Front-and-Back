"use client";

import { useState } from "react";
import { PageHeader, LoadingSpinner, ErrorState } from "@/components/shared";
import api from "@/lib/api/client";
import { normalizePaginated } from "@/lib/utils/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
}

type StatusTab = "active" | "inactive" | "all";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "all", label: "All" },
];

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  // Default to Active so the page stays focused on live accounts; archived
  // demo accounts remain reachable under Inactive or All.
  const [tab, setTab] = useState<StatusTab>("active");

  const usersQuery = useQuery({
    queryKey: ["admin-users", tab],
    queryFn: () =>
      api
        .get("/admin/users", { params: { per_page: 100, status: tab } })
        .then((res) => normalizePaginated<AdminUser>(res.data)),
  });

  const rolesQuery = useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => api.get("/admin/roles").then((res) => res.data?.data ?? res.data),
  });

  const users = usersQuery.data?.data?.data ?? [];

  const roles = Array.isArray(rolesQuery.data)
    ? (rolesQuery.data as { id: string; name: string }[])
    : ((rolesQuery.data?.items ?? []) as { id: string; name: string }[]);

  // Final selectable RMS roles. "Branch Manager" and "Accountant" remain in
  // the database (so historical role assignments are preserved) but are
  // hidden from the assignable dropdown per the finalized role list.
  const EXCLUDED_ROLES = new Set(["branch_manager", "accountant"]);
  const selectableRoles = roles.filter(
    (r) => !EXCLUDED_ROLES.has(r.name) || users.some((u) => u.role === r.name),
  );

  async function changeRole(user: AdminUser, roleId: string) {
    const roleName = roles.find((r) => r.id === roleId)?.name;
    if (!roleName || roleName === user.role) return;
    setSavingId(user.id);
    try {
      await api.put(`/admin/users/${user.id}`, { role_id: roleId });
      toast.success(`${user.name} is now ${roleName}.`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch {
      toast.error("Could not update the role.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Roles"
        description="Manage system accounts and their restaurant roles. Role changes take effect on the user's next login."
      />

      {/* Status filter — Active hides archived/demo accounts by default */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.value
                ? "bg-primary text-primary-foreground"
                : "border bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-1 text-xs text-muted-foreground">
          {usersQuery.isLoading ? "…" : `${users.length} account${users.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {usersQuery.isLoading ? (
        <LoadingSpinner />
      ) : usersQuery.isError ? (
        <ErrorState message="Failed to load users." />
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {tab === "inactive"
            ? "No deactivated accounts."
            : "No accounts found."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Last Login</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={`border-t ${u.is_active ? "" : "opacity-60"}`}>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_active
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-md border bg-background px-2 py-1 text-xs capitalize"
                      value={roles.find((r) => r.name === u.role)?.id ?? ""}
                      disabled={savingId === u.id}
                      onChange={(e) => changeRole(u, e.target.value)}
                    >
                      <option value="" disabled>Change…</option>
                      {selectableRoles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
