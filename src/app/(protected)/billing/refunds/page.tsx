"use client";

import { useState } from "react";
import { RefundTable } from "@/features/billing";
import { useRefunds } from "@/features/billing";
import { PageHeader } from "@/components/shared";

export default function RefundsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { list } = useRefunds({
    page,
    per_page: 20,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const refunds = list.data?.data?.data ?? [];
  const totalPages = list.data?.data?.meta?.last_page ?? 1;

  return (
    <div className="space-y-4">
      <PageHeader title="Refunds" description="View and manage all refunds" />

      <RefundTable
        refunds={refunds}
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
