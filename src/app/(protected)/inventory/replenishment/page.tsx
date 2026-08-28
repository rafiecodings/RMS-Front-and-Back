"use client";

import { useMemo, useState } from "react";
import { PageHeader, LoadingSpinner, ErrorState } from "@/components/shared";
import { useReplenishmentRequests } from "@/lib/hooks/useReplenishment";
import type { ReplenishmentFormData, ReplenishmentRequest } from "@/lib/hooks/useReplenishment";
import { useIngredients } from "@/lib/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  approved: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  processing: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  fulfilled: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  processing: "Processing",
  fulfilled: "Fulfilled",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const PRIORITY_LABEL: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

type Priority = "normal" | "high" | "urgent";

/** Which single-step transitions are offered in the UI, per current status. */
function availableActions(
  row: ReplenishmentRequest,
  canApprove: boolean,
  canCreate: boolean
): Array<{ target: ReplenishmentRequest["status"]; label: string; variant?: "default" | "outline" | "ghost" | "destructive" }> {
  switch (row.status) {
    case "draft":
      return [
        ...(canCreate ? [{ target: "submitted" as const, label: "Submit" }] : []),
        ...(canApprove ? [{ target: "cancelled" as const, label: "Cancel", variant: "ghost" as const }] : []),
      ];
    case "submitted":
      return [
        ...(canApprove ? [{ target: "approved" as const, label: "Approve" }] : []),
        ...(canApprove ? [{ target: "rejected" as const, label: "Reject", variant: "outline" as const }] : []),
        ...(canApprove ? [{ target: "cancelled" as const, label: "Cancel", variant: "ghost" as const }] : []),
      ];
    case "approved":
      return [
        ...(canApprove ? [{ target: "processing" as const, label: "Start Processing" }] : []),
      ];
    case "processing":
      return [
        ...(canApprove ? [{ target: "fulfilled" as const, label: "Mark Fulfilled" }] : []),
      ];
    default:
      return []; // fulfilled / rejected / cancelled are terminal
  }
}

function stockStatusLabel(current: number, minimum: number): string | null {
  if (current <= 0) return "Out of Stock";
  if (minimum > 0 && current <= minimum) return "Low Stock";
  return null;
}

export default function ReplenishmentPage() {
  const { user } = useAuth();
  const role = user?.role ?? "";
  // Backend authoritatively gates: create = admin/manager/inventory_staff;
  // approve/reject/processing/fulfilled = admin/manager.
  const canApprove = ["admin", "manager"].includes(role);
  const canCreate = ["admin", "manager", "inventory_staff"].includes(role);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ingredientId, setIngredientId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");

  const params = statusFilter === "all" ? { per_page: 50 } : { status: statusFilter, per_page: 50 };
  const { list, create, updateStatus } = useReplenishmentRequests(params);
  const ingredientsQuery = useIngredients({ per_page: 200 });
  const ingredients = useMemo(
    () => (ingredientsQuery.list.data?.data?.data ?? []) as Array<{
      id: string;
      name: string;
      unit: string;
      current_stock: number;
      minimum_stock: number;
    }>,
    [ingredientsQuery.list.data]
  );

  const rows = list.data?.data?.data ?? [];
  const selectedIngredient = ingredients.find((i) => i.id === ingredientId) ?? null;
  const qtyNumber = Number(quantity);
  const quantityInvalid =
    quantity.trim() === "" || !Number.isFinite(qtyNumber) || qtyNumber <= 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ingredientId) {
      toast.error("Select an ingredient.");
      return;
    }
    if (quantityInvalid) {
      toast.error("Quantity must be greater than zero.");
      return;
    }
    const payload: ReplenishmentFormData = {
      ingredient_id: ingredientId,
      quantity: qtyNumber,
      priority,
      status: "submitted",
    };
    create.mutate(payload, {
      onSuccess: () => {
        toast.success("Replenishment request submitted.");
        setIngredientId("");
        setQuantity("");
        setPriority("normal");
      },
      onError: (err) => {
        const data = (err as Error & { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
        if ((err as Error & { response?: { status?: number } }).response?.status === 422 && data?.errors) {
          const firstField = Object.entries(data.errors)[0];
          toast.error(firstField ? `${firstField[0]}: ${firstField[1][0]}` : (data.message ?? "Validation failed."));
          return;
        }
        toast.error(data?.message ?? "Failed to submit the request.");
      },
    });
  }

  function act(row: ReplenishmentRequest, status: ReplenishmentRequest["status"], label: string) {
    updateStatus.mutate(
      { id: row.id, status },
      {
        onSuccess: () => toast.success(`${row.request_number} ${label}.`),
        onError: (err) => {
          // Surface backend 409 transition messages when available.
          const msg =
            (
              err as Error & { response?: { data?: { message?: string } } }
            ).response?.data?.message ?? `Could not ${label.toLowerCase()} the request.`;
          toast.error(msg);
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Replenishment Requests"
        description="Ask the inventory owner to restock ingredients. Approved requests are handled outside the RMS."
      />

      {/* New request */}
      {canCreate ? (
        <form onSubmit={handleSubmit} className="rounded-lg border p-4 grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto] items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium">Ingredient</label>
            <Select value={ingredientId} onValueChange={(v) => setIngredientId(v || "")}>
              <SelectTrigger>
                {/* Always render a human-readable name — never the UUID value. */}
                <SelectValue placeholder={ingredientsQuery.list.isLoading ? "Loading…" : "Select ingredient"}>
                  {selectedIngredient
                    ? `${selectedIngredient.name}${stockStatusLabel(selectedIngredient.current_stock, selectedIngredient.minimum_stock)
                        ? ` — ${stockStatusLabel(selectedIngredient.current_stock, selectedIngredient.minimum_stock)}`
                        : ""}`
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-60 w-(--anchor-width) min-w-56">
                {ingredients.map((i) => {
                  const flag = stockStatusLabel(i.current_stock, i.minimum_stock);
                  return (
                    <SelectItem key={i.id} value={i.id} className="whitespace-normal">
                      {i.name}
                      {flag ? ` — ${flag}` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Quantity{selectedIngredient?.unit ? ` (${selectedIngredient.unit})` : ""}</label>
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              aria-invalid={quantityInvalid}
              className={`w-full rounded-md border px-3 py-2 text-sm ${quantityInvalid && quantity !== "" ? "border-red-500" : ""}`}
              placeholder={`0${selectedIngredient?.unit ? ` ${selectedIngredient.unit}` : ""}`}
            />
            {quantityInvalid && quantity !== "" && (
              <p className="text-xs text-red-600 dark:text-red-400">Quantity must be greater than zero.</p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Priority</label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={create.isPending || !ingredientId || quantityInvalid}>
            {create.isPending ? "Submitting…" : "Submit"}
          </Button>
        </form>
      ) : null}

      {/* Filter */}
      <div className="max-w-xs">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {list.isLoading ? (
        <LoadingSpinner />
      ) : list.isError ? (
        <ErrorState message="Failed to load replenishment requests." />
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No replenishment requests yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Request #</th>
                <th className="px-4 py-3 font-medium">Ingredient</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Requested By</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const actions = availableActions(r, canApprove, canCreate);
                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-3 font-mono text-xs">{r.request_number}</td>
                    <td className="px-4 py-3">{r.ingredient?.name ?? "—"}</td>
                    <td className="px-4 py-3">{r.quantity} {r.unit ?? r.ingredient?.unit ?? ""}</td>
                    <td className="px-4 py-3">{PRIORITY_LABEL[r.priority] ?? r.priority}</td>
                    <td className="px-4 py-3">{r.requester?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status] ?? ""}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {actions.map((a) => (
                          <Button
                            key={`${r.id}-${a.target}`}
                            size="sm"
                            variant={a.variant ?? "default"}
                            disabled={updateStatus.isPending}
                            onClick={() =>
                              act(
                                r,
                                a.target,
                                a.label === "Start Processing"
                                  ? "moved to processing"
                                  : `${a.label.toLowerCase()}`
                              )
                            }
                          >
                            {a.label}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
