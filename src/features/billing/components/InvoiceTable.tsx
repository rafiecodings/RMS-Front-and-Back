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
import { Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import type { Invoice } from "../types";

interface InvoiceTableProps {
  invoices: Invoice[];
  isLoading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const ORDER_TYPE_ICONS: Record<string, string> = {
  dine_in: "🍽️",
  takeaway: "🥡",
};

export function InvoiceTable({
  invoices,
  isLoading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  currentPage,
  totalPages,
  onPageChange,
}: InvoiceTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search invoice # or customer..."
            className="h-9 pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2.5 text-left font-medium">Invoice #</th>
              <th className="px-3 py-2.5 text-left font-medium">Date</th>
              <th className="px-3 py-2.5 text-left font-medium">Customer</th>
              <th className="px-3 py-2.5 text-center font-medium">Type</th>
              <th className="px-3 py-2.5 text-right font-medium">Total</th>
              <th className="px-3 py-2.5 text-right font-medium">Paid</th>
              <th className="px-3 py-2.5 text-right font-medium">Balance</th>
              <th className="px-3 py-2.5 text-center font-medium">Status</th>
              <th className="px-3 py-2.5 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-3 py-2.5">
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                  No invoices found
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b transition-colors hover:bg-muted/30"
                >
                  <td className="px-3 py-2.5 font-medium">
                    <Link
                      href={`/billing/invoices/${inv.id}`}
                      className="text-primary hover:underline"
                    >
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {formatDate(inv.created_at)}
                  </td>
                  <td className="px-3 py-2.5">
                    {inv.customer?.name ?? "Walk-in"}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span title={inv.order_type.replace("_", " ")}>
                      {ORDER_TYPE_ICONS[inv.order_type] ?? "📋"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium">
                    {formatCurrency(inv.total_amount)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {formatCurrency(inv.amount_paid)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {inv.balance > 0 ? (
                      <span className="text-destructive font-medium">
                        {formatCurrency(inv.balance)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <PaymentStatusBadge status={inv.payment_status} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Button variant="ghost" size="icon-sm" render={<Link href={`/billing/invoices/${inv.id}`} />}>
                      <Eye className="h-4 w-4" />
                    </Button>
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
