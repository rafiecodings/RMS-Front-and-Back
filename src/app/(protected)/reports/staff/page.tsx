"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import {
  ReportFilters,
  ReportSummaryCard,
  StaffPerformanceTable,
  AttendanceSummaryCard,
  ClockSummaryCard,
  ShiftCoverageCard,
  ExportButton,
} from "@/features/reports";
import { useStaffReport } from "@/features/reports/hooks/useReports";
import type { ReportPeriod, DateRange } from "@/features/reports/types";
import { LoadingSpinner } from "@/components/shared";

export default function StaffReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: report, isLoading } = useStaffReport({ period, date_range: dateRange });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Staff Reports"
          description="Productivity, attendance, and labor cost"
        />
        <ExportButton
          reportType="staff"
          period={period}
          dateRange={dateRange}
        />
      </div>

      <ReportFilters
        period={period}
        dateRange={dateRange}
        onPeriodChange={setPeriod}
        onDateRangeChange={setDateRange}
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : report ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <ReportSummaryCard
              title="Total Staff"
              value={report.total_staff}
              format="number"
            />
            <ReportSummaryCard
              title="Active Staff"
              value={report.active_staff}
              format="number"
            />
            <ReportSummaryCard
              title="Labor Cost"
              value={report.total_labor_cost}
              format="currency"
            />
            <ReportSummaryCard
              title="Labor Cost %"
              value={report.labor_cost_percentage}
              format="percentage"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <AttendanceSummaryCard data={report.attendance_summary} />
            <ClockSummaryCard data={report.clock_summary} />
            <ShiftCoverageCard data={report.shift_coverage} />
          </div>

          <StaffPerformanceTable data={report.performance_ranking} />
        </>
      ) : (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-muted-foreground">No staff data available.</p>
        </div>
      )}
    </div>
  );
}
