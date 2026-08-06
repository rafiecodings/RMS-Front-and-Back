"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { PerformanceCard } from "@/features/staff";
import { useStaff, useStaffPerformance } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { safeNumber, formatCurrency } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PerformancePage() {
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  const { list: staffList } = useStaff({ per_page: 200 });
  const staff = staffList.data?.data?.data ?? [];

  const { data: performance, isLoading: perfLoading } = useStaffPerformance(selectedStaffId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance Summary"
        description="View staff performance metrics and analytics"
      />

      <div className="flex items-center gap-4">
        <div className="w-full sm:w-[280px]">
          <Select value={selectedStaffId} onValueChange={(v) => setSelectedStaffId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Select a staff member" />
            </SelectTrigger>
            <SelectContent>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
                <span className="text-sm text-muted-foreground">Tips Earned</span>
                <span className="font-medium tabular-nums">₱{safeNumber(performance.tips_earned).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Orders Handled</span>
                <span className="font-medium tabular-nums">{performance.orders_handled}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tables Served</span>
                <span className="font-medium tabular-nums">{performance.tables_served}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Attendance & Feedback</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Attendance Rate</span>
                <span className="font-medium tabular-nums">{safeNumber(performance.attendance_rate).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Punctuality Score</span>
                <span className="font-medium tabular-nums">{safeNumber(performance.punctuality_score).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Average Rating</span>
                <span className="font-medium tabular-nums">{safeNumber(performance.average_rating).toFixed(1)} / 5.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Customer Reviews</span>
                <span className="font-medium tabular-nums">{performance.customer_feedback_count}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
