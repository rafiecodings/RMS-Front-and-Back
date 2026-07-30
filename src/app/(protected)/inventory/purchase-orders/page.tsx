"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { PurchaseOrderTable, PurchaseOrderStats } from "@/features/inventory";
import { usePurchaseOrders } from "@/lib/hooks";
import { Plus } from "lucide-react";

export default function PurchaseOrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { list } = usePurchaseOrders({
    page,
    per_page: 20,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const orders = list.data?.data?.data ?? [];
  const totalPages = list.data?.data?.meta?.last_page ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Create and manage supplier purchase orders"
        action={
          <Button render={<Link href="/inventory/purchase-orders/new" />}>
            <Plus className="h-4 w-4 mr-1" />
            New PO
          </Button>
        }
      />

      <PurchaseOrderStats
        stats={{
          totalOrders: list.data?.data?.meta?.total ?? 0,
          pendingOrders: orders.filter((o) => ["draft", "pending", "approved"].includes(o.status)).length,
          receivedThisMonth: orders.filter((o) => o.status === "received").length,
          totalSpent: orders.filter((o) => o.status === "received").reduce((sum, o) => sum + o.total_amount, 0),
        }}
        isLoading={list.isLoading}
      />

      <PurchaseOrderTable
        orders={orders}
        isLoading={list.isLoading}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(v) => {
          setStatusFilter(v);
          setPage(1);
        }}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
