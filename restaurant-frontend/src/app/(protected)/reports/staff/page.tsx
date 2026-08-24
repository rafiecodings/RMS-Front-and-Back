"use client";

import { useState } from "react";
import { PageHeader, ErrorState } from "@/components/shared";
import {
  ReportFilters,
  ReportSummaryCard,
  StaffPerformanceTable,
  AttendanceSummaryCard,
  ExportButton,
} from "@/features/reports";
import { useStaffReport } from "@/features/reports/hooks/useReports";
import type { ReportPeriod, DateRange } from "@/features/reports/types";
import { LoadingSpinner } from "@/components/shared";

export default function StaffReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: report, isLoading, isError } = useStaffReport({ period, date_range: dateRange });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Staff Reports"
          description="Orders handled, sales contribution, and attendance"
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
      ) : isError ? (
        <ErrorState message="Failed to load the staff report. Please try again." />
      ) : report ? (
        <>
          {/* Labor-cost figures are not tracked; only real operational
              metrics are shown. */}
          <div className="grid gap-4 sm:grid-cols-3">
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
              title="Attendance Rate"
              value={report.attendance_summary.attendance_rate ?? 0}
              format="percentage"
              subtitle={
                report.attendance_summary.attendance_rate == null
                  ? "No attendance records in this period"
                  : undefined
              }
            />
          </div>

          <AttendanceSummaryCard data={report.attendance_summary} />

          {report.performance_ranking.length === 0 ? (
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <p className="text-muted-foreground">
                No completed orders were attributed to staff in this period.
              </p>
            </div>
          ) : (
            <StaffPerformanceTable data={report.performance_ranking} />
          )}
        </>
      ) : (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-muted-foreground">No staff data available.</p>
        </div>
      )}
    </div>
  );
}
