"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { DetailPageSkeleton } from "@/components/shared";
import { InvoiceDetail, ReceiptPrint } from "@/features/billing";
import { useInvoice } from "@/features/billing";

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: invoice, isLoading } = useInvoice(id);
  const [showPrint, setShowPrint] = useState(false);

  if (isLoading) {
    return (
      <DetailPageSkeleton />
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Invoice not found</p>
      </div>
    );
  }

  if (showPrint) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setShowPrint(false)}
          className="text-sm text-primary hover:underline"
        >
          ← Back to invoice
        </button>
        <ReceiptPrint invoice={invoice} showPrintButton={true} />
      </div>
    );
  }

  return (
    <InvoiceDetail
      invoice={invoice}
      onPrint={() => setShowPrint(true)}
      onRefund={() =>
        router.push(`/billing/refunds/${invoice.id}`)
      }
    />
  );
}
