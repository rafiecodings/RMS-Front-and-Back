"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { PerformanceCard } from "@/features/staff";
import { useStaff, useStaffPerformance } from "@/lib/hooks";
import { safeNumber } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PerformancePage() {
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { list: staffList } = useStaff({ per_page: 200 });
  const staff = staffList.data?.data?.data ?? [];
  const staffLoading = staffList.isLoading;
  const selectedStaff = staff.find((s) => s.id === selectedStaffId);
  const staffDisplay = selectedStaffId
    ? selectedStaff
      ? selectedStaff.user?.name ?? selectedStaff.employee_id
      : staffLoading
        ? "Loading..."
        : "Unavailable staff"
    : null;

  const { data: performance, isLoading: perfLoading } = useStaffPerformance(selectedStaffId, {
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance Summary"
        description="View staff performance metrics and analytics"
      />

      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-full sm:w-[280px]">
          <Select value={selectedStaffId} onValueChange={(v) => setSelectedStaffId(v ?? "")}>
            <SelectTrigger>
              {staffDisplay ? <span className="truncate">{staffDisplay}</span> : <SelectValue placeholder="Select a staff member" />}
            </SelectTrigger>
            <SelectContent>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id} className="truncate">
                  {s.user?.name ?? s.employee_id}
                </SelectItem>
              ))}
              {selectedStaffId && !selectedStaff && (
                <SelectItem value={selectedStaffId} disabled className="truncate">
                  {staffDisplay}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 rounded-xl border px-3 text-sm" aria-label="Start date" />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-10 rounded-xl border px-3 text-sm" aria-label="End date" />
      </div>

      {selectedStaffId ? (
        <PerformanceCard performance={performance} isLoading={perfLoading} />
      ) : (
        <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
          Select a staff member to view their performance metrics
        </div>
      )}

      {performance && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-card p-6 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sales Performance</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Sales</span>
                <span className="font-medium tabular-nums">₱{safeNumber(performance.total_sales).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Orders Handled</span>
                <span className="font-medium tabular-nums">{performance.orders_handled}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Attendance</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Hours Worked</span>
                <span className="font-medium tabular-nums">{safeNumber(performance.hours_worked).toFixed(1)}h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Days Present</span>
                <span className="font-medium tabular-nums">{performance.days_present}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Period</span>
                <span className="font-medium tabular-nums">{performance.period.start_date} to {performance.period.end_date}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
