"use client";

import { useState } from "react";
import { InvoiceTable } from "@/features/billing";
import { useInvoices } from "@/features/billing";
import { PageHeader } from "@/components/shared";

export default function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { list } = useInvoices({
    page,
    per_page: 20,
    search: search || undefined,
    payment_status: statusFilter === "all" ? undefined : statusFilter,
  });

  const invoices = list.data?.data ?? [];
  const totalPages = list.data?.meta?.last_page ?? 1;

  return (
    <div className="space-y-4">
      <PageHeader title="Invoices" description="View and manage all invoices" />

      <InvoiceTable
        invoices={invoices}
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
