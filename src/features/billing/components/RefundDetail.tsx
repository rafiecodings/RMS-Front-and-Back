"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Refund } from "../types";

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
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

interface RefundDetailProps {
  refund: Refund;
}

export function RefundDetail({ refund }: RefundDetailProps) {
  const statusConfig = STATUS_CONFIG[refund.status] ?? STATUS_CONFIG.pending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/billing/refunds" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">
            Refund #{refund.refund_number}
          </h2>
          <p className="text-xs text-muted-foreground">
            {new Date(refund.created_at).toLocaleString("en-PH")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Refund Information</h3>
              <Badge variant="secondary" className={statusConfig.className}>
                {statusConfig.label}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Refund Number</p>
                <p className="font-medium">{refund.refund_number}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Invoice</p>
                <Link
                  href={`/billing/invoices/${refund.invoice_id}`}
                  className="text-primary hover:underline font-medium"
                >
                  {refund.order_number}
                </Link>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="capitalize">{refund.type.replace("_", " ")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-bold text-destructive">
                  -{formatCurrency(refund.total_amount)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <h3 className="text-sm font-semibold">Reason</h3>
            <p className="text-sm text-muted-foreground">{refund.reason}</p>
          </div>

          {refund.items && refund.items.length > 0 && (
            <div className="rounded-lg border">
              <div className="border-b bg-muted/50 px-3 py-2">
                <h3 className="text-sm font-semibold">Refunded Items</h3>
              </div>
              <div className="divide-y">
                {refund.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {item.quantity}× {item.menu_item_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Unit price: {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-destructive">
                      -{formatCurrency(item.refund_amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Approval</h3>
            <div className="space-y-2 text-sm">
              {refund.processed_by && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processed By</span>
                  <span>{refund.processed_by.name}</span>
                </div>
              )}
              {refund.approved_by && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approved By</span>
                  <span>{refund.approved_by.name}</span>
                </div>
              )}
              {refund.processed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processed At</span>
                  <span>
                    {new Date(refund.processed_at).toLocaleString("en-PH")}
                  </span>
                </div>
              )}
              {!refund.processed_by && !refund.approved_by && (
                <p className="text-xs text-muted-foreground">
                  No approval information available
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
