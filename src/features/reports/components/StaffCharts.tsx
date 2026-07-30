"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AttendanceSummary, ClockSummary, ShiftCoverage } from "../types";

interface AttendanceSummaryCardProps {
  data: AttendanceSummary;
}

export function AttendanceSummaryCard({ data }: AttendanceSummaryCardProps) {
  const stats = [
    { label: "Present", value: data.present, color: "text-emerald-600" },
    { label: "Absent", value: data.absent, color: "text-red-600" },
    { label: "Late", value: data.late, color: "text-amber-600" },
    { label: "On Leave", value: data.on_leave, color: "text-blue-600" },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Attendance Overview</CardTitle>
        <span className="text-sm font-medium text-emerald-600">
          {data.attendance_rate.toFixed(1)}%
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface ClockSummaryCardProps {
  data: ClockSummary;
}

export function ClockSummaryCard({ data }: ClockSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Work Hours Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Avg Hours/Day</p>
            <p className="text-2xl font-bold">{data.average_hours_per_day.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Overtime</p>
            <p className="text-2xl font-bold text-amber-600">
              {data.overtime_hours.toFixed(1)}h
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Hours</p>
            <p className="text-2xl font-bold">{data.total_worked_hours.toFixed(1)}h</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ShiftCoverageCardProps {
  data: ShiftCoverage[];
}

export function ShiftCoverageCard({ data }: ShiftCoverageCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Shift Coverage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.shift} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="capitalize font-medium">
                  {item.shift.replace(/_/g, " ")}
                </span>
                <span className="text-muted-foreground">
                  {item.staff_count} staff ({item.coverage_percentage.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${item.coverage_percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
