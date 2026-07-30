"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, File } from "lucide-react";
import { useExportReport } from "../hooks/useReports";
import type { ExportFormat, DateRange } from "../types";
import { toast } from "sonner";

interface ExportButtonProps {
  reportType: string;
  period: string;
  dateRange?: DateRange;
}

export function ExportButton({ reportType, period, dateRange }: ExportButtonProps) {
  const exportMutation = useExportReport();

  const handleExport = async (format: ExportFormat) => {
    const payload = {
      report_type: reportType,
      format,
      date_from: dateRange?.from || new Date().toISOString().split("T")[0],
      date_to: dateRange?.to || new Date().toISOString().split("T")[0],
      filters: { period },
    };

    try {
      const blob = await exportMutation.mutateAsync(payload);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "pdf" ? "pdf" : format === "excel" ? "xlsx" : "csv";
      a.download = `${reportType}_report.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch {
      toast.error("Failed to export report");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <Download className="mr-2 h-4 w-4" />
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileText className="mr-2 h-4 w-4" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <File className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
