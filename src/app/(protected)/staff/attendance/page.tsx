"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { AttendanceTable, ClockInOutButton } from "@/features/staff";
import { useAttendance, useClockIn, useClockOut } from "@/lib/hooks";
import { toast } from "sonner";

export default function AttendancePage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const today = new Date().toISOString().split("T")[0];

  const attendanceQuery = useAttendance({
    page,
    per_page: 20,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    date: today,
  });

  const records = attendanceQuery.data?.data?.data ?? [];
  const totalPages = attendanceQuery.data?.data?.meta?.last_page ?? 1;

  const clockIn = useClockIn();
  const clockOut = useClockOut();

  const isClockedIn = records.some((r) => r.status === "present" && !r.clock_out);

  function handleClockIn() {
    clockIn.mutate(undefined, {
      onSuccess: () => toast.success("Clocked in successfully"),
      onError: (e: Error) => toast.error(e.message || "Failed to clock in"),
    });
  }

  function handleClockOut() {
    clockOut.mutate(undefined, {
      onSuccess: () => toast.success("Clocked out successfully"),
      onError: (e: Error) => toast.error(e.message || "Failed to clock out"),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Track staff attendance and clock in/out"
        action={
          <ClockInOutButton
            isClockedIn={isClockedIn}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            isLoading={clockIn.isPending || clockOut.isPending}
          />
        }
      />

      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Today: {new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

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
