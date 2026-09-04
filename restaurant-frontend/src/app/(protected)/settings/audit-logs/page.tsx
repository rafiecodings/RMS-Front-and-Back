"use client";

import { useState } from "react";
import { PageHeader, LoadingSpinner, ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import api from "@/lib/api/client";
import { normalizePaginated } from "@/lib/utils/api";
import { useQuery } from "@tanstack/react-query";

interface AuditLogRow {
  id: string;
  user?: { id: string; name: string; email: string } | null;
  action: string;
  model: string | null;
  model_id: string | null;
  new_values?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at: string;
}

const PAGE_SIZE = 20;
const DEMO_EMAIL_DOMAIN = "kainanexpress.com";

const MODULE_LABELS: Record<string, string> = {
  "App\\Models\\Order": "Order",
  "App\\Models\\MenuItem": "Menu Item",
  "App\\Models\\MenuCategory": "Menu Category",
  "App\\Models\\Customer": "Customer",
  "App\\Models\\Ingredient": "Ingredient",
  "App\\Models\\Payment": "Payment",
  "App\\Models\\Table": "Table",
  "App\\Models\\User": "User",
  "App\\Models\\Reservation": "Reservation",
  "App\\Models\\KotTicket": "Kitchen Ticket",
};

const MODULE_OPTIONS = Object.entries(MODULE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function friendlyModule(raw: string | null | undefined): string {
  if (!raw) return "System";
  return MODULE_LABELS[raw] ?? raw.split("\\").pop() ?? raw;
}

function friendlyAction(action: string): string {
  return action.replace(/[_-]/g, " ");
}

function recordReference(row: AuditLogRow): string {
  const nv = row.new_values;
  if (nv && typeof nv === "object") {
    const key = [
      "order_number",
      "number",
      "reference",
      "code",
      "table_number",
      "name",
      "email",
    ].find((k) => nv[k] != null);
    if (key) return String(nv[key]);
  }
  return row.model_id ? `#${row.model_id}` : "—";
}

function descriptionFor(row: AuditLogRow): string {
  const description = row.new_values?.description;
  if (typeof description === "string" && description.trim()) return description;
  return friendlyAction(row.action);
}

function isDemoRow(row: AuditLogRow): boolean {
  const email = row.user?.email?.toLowerCase() ?? "";
  return email.endsWith(`@${DEMO_EMAIL_DOMAIN}`);
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const [hideDemo, setHideDemo] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-logs", page, moduleFilter],
    queryFn: () =>
      api
        .get("/admin/audit-logs", {
          params: {
            page,
            per_page: PAGE_SIZE,
            ...(moduleFilter ? { model: moduleFilter } : {}),
          },
        })
        .then((res) => normalizePaginated<AuditLogRow>(res.data)),
  });

  const rows = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  const visibleRows = hideDemo ? rows.filter((r) => !isDemoRow(r)) : rows;

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Audit Logs"
        description="System activity trail. Entries are read-only and retained automatically."
      />

      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-9 rounded-lg border bg-background px-2 text-xs capitalize"
          value={moduleFilter}
          onChange={(e) => {
            setModuleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Modules</option>
          {MODULE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setHideDemo((v) => !v)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            hideDemo
              ? "bg-primary text-primary-foreground"
              : "border bg-background text-muted-foreground hover:bg-muted"
          }`}
        >
          Hide demo/legacy logs
        </button>

        <span className="ml-1 text-xs text-muted-foreground">
          {isLoading
            ? "…"
            : `${visibleRows.length} shown${
                meta ? ` · ${meta.total} total` : ""
              }`}
        </span>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <ErrorState message="Failed to load audit logs." />
      ) : visibleRows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No audit entries recorded yet.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border -mx-3 sm:mx-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Date / Time</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Module</th>
                  <th className="px-4 py-3 font-medium">Record</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {r.user?.name ?? "System"}
                      {r.user?.email ? (
                        <span className="block text-xs text-muted-foreground">
                          {r.user.email}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs capitalize">
                      {friendlyAction(r.action)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {friendlyModule(r.model)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {recordReference(r)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {descriptionFor(r)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              Page {meta?.current_page ?? 1} of {meta?.last_page ?? 1}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!meta || page >= meta.last_page || isLoading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
