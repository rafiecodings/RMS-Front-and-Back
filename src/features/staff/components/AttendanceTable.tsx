"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate, formatTime, safeNumber } from "@/lib/utils";
import { StatusBadge, TableLoadingRows, TableEmptyRow } from "@/components/shared";
import { Input } from "@/components/ui/input";
import type { AttendanceRecord } from "@/lib/types";

interface AttendanceTableProps {
  records: AttendanceRecord[];
  isLoading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const STATUS_STYLES: Record<string, string> = {
  present: "bg-green-100 text-green-800",
  late: "bg-amber-100 text-amber-800",
  half_day: "bg-orange-100 text-orange-800",
  absent: "bg-red-100 text-red-800",
  on_leave: "bg-blue-100 text-blue-800",
};

export function AttendanceTable({
  records,
  isLoading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  currentPage,
  totalPages,
  onPageChange,
}: AttendanceTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search staff..."
            className="h-9 pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[150px] h-9">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="present">Present</SelectItem>
            <SelectItem value="late">Late</SelectItem>
            <SelectItem value="half_day">Half Day</SelectItem>
            <SelectItem value="absent">Absent</SelectItem>
            <SelectItem value="on_leave">On Leave</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Staff</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-center px-4 py-3 font-medium">Clock In</th>
              <th className="text-center px-4 py-3 font-medium">Clock Out</th>
              <th className="text-right px-4 py-3 font-medium">Hours</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <TableLoadingRows colSpan={6} />
            ) : records.length === 0 ? (
              <TableEmptyRow message="No attendance records found" colSpan={6} />
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                   <td className="px-4 py-3">
                     <p className="font-medium">{r.staff?.user?.name ?? "—"}</p>
                   </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(r.date)}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums">
                    {r.clock_in ? new Date(r.clock_in).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums">
                    {r.clock_out ? new Date(r.clock_out).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.total_hours != null ? `${safeNumber(r.total_hours).toFixed(1)}h` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status] ?? "bg-gray-100 text-gray-800"}`}>
                      {r.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
