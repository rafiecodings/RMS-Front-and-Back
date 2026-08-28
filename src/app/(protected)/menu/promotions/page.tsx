"use client";

import { useMemo } from "react";
import { PageHeader, LoadingSpinner, ErrorState } from "@/components/shared";
import api from "@/lib/api/client";
import { normalizePaginated } from "@/lib/utils/api";
import { useQuery } from "@tanstack/react-query";

interface Discount {
  id: string;
  name: string;
  code: string | null;
  type: "percentage" | "fixed";
  value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  applies_to: string;
}

export default function PromotionsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["discounts"],
    queryFn: () =>
      api
        .get("/discounts", { params: { per_page: 100 } })
        .then((res) => normalizePaginated<Discount>(res.data)),
  });

  const discounts = useMemo(() => data?.data?.data ?? [], [data]);
  const active = discounts.filter((d) => d.is_active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promotions & Discounts"
        description="Base menu prices never change — promotions are applied at checkout. When several apply, the system uses the single highest eligible promotion (no stacking)."
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <ErrorState message="Failed to load promotions." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Total Promotions</p>
              <p className="text-2xl font-semibold">{discounts.length}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-2xl font-semibold">{active}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Inactive</p>
              <p className="text-2xl font-semibold">{discounts.length - active}</p>
            </div>
          </div>

          {discounts.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No promotions configured.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Discount</th>
                    <th className="px-4 py-3 font-medium">Min Spend</th>
                    <th className="px-4 py-3 font-medium">Valid Until</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {discounts.map((d) => (
                    <tr key={d.id} className="border-t">
                      <td className="px-4 py-3">{d.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{d.code ?? "—"}</td>
                      <td className="px-4 py-3">
                        {d.type === "percentage" ? `${d.value}%` : `₱${Number(d.value).toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3">
                        {Number(d.min_order_amount) > 0 ? `₱${Number(d.min_order_amount).toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {d.end_date ? new Date(d.end_date).toLocaleDateString() : "No expiry"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            d.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {d.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
