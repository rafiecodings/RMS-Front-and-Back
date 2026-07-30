"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { InvoiceStats } from "@/features/billing";
import { useBillingStats, useInvoices } from "@/features/billing";
import { formatCurrency } from "@/lib/utils";
import { Receipt, CreditCard, RotateCcw, ArrowRight } from "lucide-react";

export default function BillingPage() {
  const { data: stats, isLoading: statsLoading } = useBillingStats();
  const { list: recentInvoices } = useInvoices({ per_page: 5, sort: "created_at", order: "desc" });
  const invoices = recentInvoices.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Manage invoices, payments, and refunds"
      />

      <InvoiceStats stats={stats} isLoading={statsLoading} />

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/billing/invoices" className="group">
          <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              <Receipt className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Invoices</h3>
              <p className="text-xs text-muted-foreground">View all invoices</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link href="/billing/payments" className="group">
          <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <CreditCard className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Payment History</h3>
              <p className="text-xs text-muted-foreground">Track all payments</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link href="/billing/refunds" className="group">
          <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
              <RotateCcw className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Refunds</h3>
              <p className="text-xs text-muted-foreground">Process and manage refunds</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>

      {invoices.length > 0 && (
        <div className="rounded-lg border">
          <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
            <h3 className="text-sm font-semibold">Recent Invoices</h3>
            <Button variant="ghost" size="sm" render={<Link href="/billing/invoices" />}>
              View All
            </Button>
          </div>
          <div className="divide-y">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link
                    href={`/billing/invoices/${inv.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {inv.invoice_number}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {new Date(inv.created_at).toLocaleDateString("en-PH")} •{" "}
                    {inv.customer?.name ?? "Walk-in"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(inv.total_amount)}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {inv.payment_status.replace("_", " ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
