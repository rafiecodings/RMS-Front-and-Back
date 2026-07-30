"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { SupplierTable } from "@/features/inventory";
import { useSuppliers } from "@/lib/hooks";
import { Plus } from "lucide-react";

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { list } = useSuppliers({
    page,
    per_page: 20,
    search: search || undefined,
  });

  const suppliers = list.data?.data?.data ?? [];
  const totalPages = list.data?.data?.meta?.last_page ?? 1;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Suppliers"
        description="Manage your supplier directory"
        action={
          <Button render={<Link href="/inventory/suppliers/new" />}>
            <Plus className="h-4 w-4 mr-1" />
            Add Supplier
          </Button>
        }
      />

      <SupplierTable
        suppliers={suppliers}
        isLoading={list.isLoading}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
