"use client";

import { useState } from "react";
import { PaymentHistoryTable } from "@/features/billing";
import { usePaymentHistory } from "@/features/billing";
import { PageHeader } from "@/components/shared";

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data: paymentsData, isLoading } = usePaymentHistory({
    page,
    per_page: 20,
    search: search || undefined,
    payment_method: methodFilter === "all" ? undefined : methodFilter,
  });

  const payments = paymentsData?.data?.data ?? [];
  const totalPages = paymentsData?.data?.meta?.last_page ?? 1;

  return (
    <div className="space-y-4">
      <PageHeader title="Payment History" description="Track all payments across orders" />

      <PaymentHistoryTable
        payments={payments}
        isLoading={isLoading}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        methodFilter={methodFilter}
        onMethodFilterChange={(v) => {
          setMethodFilter(v);
          setPage(1);
        }}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
