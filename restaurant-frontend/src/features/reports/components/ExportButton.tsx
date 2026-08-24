"use client";

import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useExportReport } from "../hooks/useReports";
import { resolveReportRange } from "../utils/resolveReportRange";
import type { ReportPeriod } from "../types";
import { toast } from "sonner";

interface ExportButtonProps {
  reportType: string;
  period: ReportPeriod;
  dateRange?: { from?: string; to?: string };
}

/**
 * Single supported export format: CSV (streamed server-side).
 * JSON support remains internal to the API but is not user-facing.
 */
export function ExportButton({ reportType, period, dateRange }: ExportButtonProps) {
  const exportMutation = useExportReport();

  const handleExport = async () => {
    // Same explicit range contract as every other report call.
    const { start_date, end_date } = resolveReportRange(period, dateRange);

    try {
      const blob = await exportMutation.mutateAsync({
        type: reportType,
        format: "csv",
        start_date,
        end_date,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType}_report_${start_date}_to_${end_date}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Report exported as CSV");
    } catch (error) {
      const message =
        error instanceof Error && error.message !== "Export failed"
          ? error.message
          : "Failed to export report";
      toast.error(message);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={exportMutation.isPending}
    >
      {exportMutation.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Export CSV
    </Button>
  );
}
