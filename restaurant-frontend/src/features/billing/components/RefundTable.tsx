"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Refund } from "../types";

interface RefundTableProps {
  refunds: Refund[];
  isLoading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  },
  approved: {
    label: "Approved",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  completed: {
    label: "Completed",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
};

export function RefundTable({
  refunds,
  isLoading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  currentPage,
  totalPages,
  onPageChange,
}: RefundTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search refund or invoice #..."
            className="h-9 pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2.5 text-left font-medium">Refund #</th>
              <th className="px-3 py-2.5 text-left font-medium">Invoice #</th>
              <th className="px-3 py-2.5 text-left font-medium">Date</th>
              <th className="px-3 py-2.5 text-center font-medium">Type</th>
              <th className="px-3 py-2.5 text-right font-medium">Amount</th>
              <th className="px-3 py-2.5 text-center font-medium">Status</th>
              <th className="px-3 py-2.5 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-3 py-2.5">
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : refunds.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  No refunds found
                </td>
              </tr>
            ) : (
              refunds.map((r) => {
                const statusCfg =
                  STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
                return (
                  <tr
                    key={r.id}
                    className="border-b transition-colors hover:bg-muted/30"
                  >
                    <td className="px-3 py-2.5 font-medium">
                      {r.refund_number}
                    </td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/billing/invoices/${r.invoice_id}`}
                        className="text-primary hover:underline"
                      >
                        {r.order_number}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-3 py-2.5 text-center capitalize">
                      {r.type.replace("_", " ")}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-destructive">
                      -{formatCurrency(r.total_amount)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge variant="secondary" className={statusCfg.className}>
                        {statusCfg.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Button variant="ghost" size="icon-sm" render={<Link href={`/billing/refunds/${r.id}`} />}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
