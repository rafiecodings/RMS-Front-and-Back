"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { StaffTable } from "@/features/staff";
import { useStaff } from "@/lib/hooks";
import { Plus } from "lucide-react";

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { list } = useStaff({
    page,
    per_page: 20,
    search: search || undefined,
    role: roleFilter === "all" ? undefined : roleFilter,
  });

  const staff = list.data?.data?.data ?? [];
  const totalPages = list.data?.data?.meta?.last_page ?? 1;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Employees"
        description="Manage staff profiles, roles, and assignments"
        action={
          <Button render={<Link href="/staff/employees/new" />}>
            <Plus className="h-4 w-4 mr-1" />
            Add Staff
          </Button>
        }
      />

      <StaffTable
        staff={staff}
        isLoading={list.isLoading}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        roleFilter={roleFilter}
        onRoleFilterChange={(v) => { setRoleFilter(v); setPage(1); }}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
