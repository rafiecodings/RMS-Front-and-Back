"use client";

import { useState, useRef, useMemo } from "react";
import Link from "next/link";
import { PageHeader, ConfirmDialog, SearchInput } from "@/components/shared";
import { CustomerTable, CustomerStats } from "@/features/customers";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useCustomers } from "@/lib/hooks";
import { DEBOUNCE_DELAY, ITEMS_PER_PAGE } from "@/lib/utils/constants";
import type { Customer } from "@/lib/types";
import { toast } from "sonner";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const params = useMemo(() => ({
    page,
    per_page: ITEMS_PER_PAGE,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(typeFilter !== "all" && { customer_type: typeFilter }),
  }), [page, debouncedSearch, typeFilter]);

  const { list, remove } = useCustomers(params);

  const customers = list.data?.data?.data ?? [];
  const meta = list.data?.data?.meta;

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, DEBOUNCE_DELAY);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Customer deleted successfully");
        setDeleteTarget(null);
      },
      onError: () => {
        toast.error("Failed to delete customer");
      },
    });
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage customer profiles and loyalty"
        action={
          <Button size="sm" render={<Link href="/customers/new" />}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Customer
          </Button>
        }
      />

      <div className="space-y-6">
        <CustomerStats customers={customers} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search customers..."
          />
          <Select
            value={typeFilter}
            onValueChange={(val) => {
              setTypeFilter(val ?? "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="walk_in">Walk-in</SelectItem>
              <SelectItem value="registered">Registered</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <CustomerTable
          customers={customers}
          isLoading={list.isLoading}
          onDelete={(c) => setDeleteTarget(c)}
        />

        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(meta.current_page - 1) * meta.per_page + 1}–
              {Math.min(meta.current_page * meta.per_page, meta.total)} of{" "}
              {meta.total}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(meta.last_page, 5) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              {meta.last_page > 5 && (
                <span className="flex items-center px-1 text-muted-foreground">
                  …
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Customer"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        isLoading={remove.isPending}
      />
    </div>
  );
}
