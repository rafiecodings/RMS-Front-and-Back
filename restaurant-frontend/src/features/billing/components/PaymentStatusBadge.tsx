import { Badge } from "@/components/ui/badge";
import type { PaymentStatus } from "../types";

const STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  paid: {
    label: "Paid",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  partial: {
    label: "Partial",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  },
  unpaid: {
    label: "Unpaid",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  refunded: {
    label: "Refunded",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  },
  partially_refunded: {
    label: "Partial Refund",
    className:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  },
};

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.unpaid;
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
