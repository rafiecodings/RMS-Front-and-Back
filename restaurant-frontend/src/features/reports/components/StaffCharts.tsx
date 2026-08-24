"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AttendanceSummary } from "../types";

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
          {data.attendance_rate != null
            ? `${data.attendance_rate.toFixed(1)}%`
            : "No records"}
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
