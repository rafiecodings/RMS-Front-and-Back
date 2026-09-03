"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Payment } from "@/lib/types";

interface PaymentHistoryTableProps {
  payments: Payment[];
  isLoading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  methodFilter: string;
  onMethodFilterChange: (v: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  e_wallet: "E-Wallet",
  bank_transfer: "Bank Transfer",
  gift_card: "Gift Card",
  loyalty_points: "Loyalty Points",
};

export function PaymentHistoryTable({
  payments,
  isLoading,
  search,
  onSearchChange,
  methodFilter,
  onMethodFilterChange,
  currentPage,
  totalPages,
  onPageChange,
}: PaymentHistoryTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search reference..."
            className="h-9 pl-8"
          />
        </div>
        <Select value={methodFilter} onValueChange={(v) => onMethodFilterChange(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="e_wallet">E-Wallet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2.5 text-left font-medium">Date</th>
              <th className="px-3 py-2.5 text-left font-medium">Method</th>
              <th className="px-3 py-2.5 text-right font-medium">Amount</th>
              <th className="px-3 py-2.5 text-left font-medium">Reference</th>
              <th className="px-3 py-2.5 text-left font-medium">Processed By</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-3 py-2.5">
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  No payments found
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="border-b transition-colors hover:bg-muted/30">
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {formatDateTime(p.processed_at)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="capitalize">
                      {METHOD_LABELS[p.payment_method] ?? p.payment_method}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {p.reference ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {p.processed_by?.name ?? "—"}
                  </td>
                </tr>
              ))
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
