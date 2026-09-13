"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { AttendanceTable } from "@/features/staff";
import { useAttendance } from "@/lib/hooks";
import { SelfAttendance } from "@/features/staff/components/SelfAttendance";
import { MySchedule } from "@/features/staff";

export default function AttendancePage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [today] = useState(() => new Date().toISOString().split("T")[0]);

  const attendanceQuery = useAttendance({
    page,
    per_page: 20,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    date: today,
  });

  const records = attendanceQuery.data?.data?.data ?? [];
  const totalPages = attendanceQuery.data?.data?.meta?.last_page ?? 1;

  const todayDisplay = new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Track staff attendance and clock in/out"
      />

      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Today: {todayDisplay}
        </p>
      </div>

      <SelfAttendance />

      <MySchedule />

      {attendanceQuery.isError && <p role="alert">Unable to load attendance records.</p>}
      <AttendanceTable
        records={records}
        isLoading={attendanceQuery.isLoading}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        statusFilter={statusFilter}
        onStatusFilterChange={(v) => { setStatusFilter(v); setPage(1); }}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
