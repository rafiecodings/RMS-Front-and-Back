"use client";

import { use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LoadingSpinner } from "@/components/shared";
import { RefundForm } from "@/features/billing";
import { useInvoice } from "@/features/billing";

export default function ProcessRefundPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const { data: invoice, isLoading } = useInvoice(orderId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Invoice not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/billing/refunds" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Process Refund</h1>
          <p className="text-sm text-muted-foreground">
            Invoice #{invoice.invoice_number}
          </p>
        </div>
      </div>

      <RefundForm invoice={invoice} />
    </div>
  );
}
