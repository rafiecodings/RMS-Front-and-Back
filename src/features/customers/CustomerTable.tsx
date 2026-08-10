"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared";
import { EntityActionDropdown } from "@/components/shared";
import type { Customer } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

const CUSTOMER_TYPE_BADGE: Record<string, string> = {
  walk_in: "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300",
  registered:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  regular:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  corporate:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  vip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

interface CustomerTableProps {
  customers: Customer[];
  isLoading?: boolean;
  onDelete?: (customer: Customer) => void;
}

export function CustomerTable({
  customers,
  isLoading,
  onDelete,
}: CustomerTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">No customers found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead className="hidden md:table-cell">Phone</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Points</TableHead>
            <TableHead className="text-right hidden lg:table-cell">
              Orders
            </TableHead>
            <TableHead className="text-right hidden lg:table-cell">
              Total Spent
            </TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>
                <Link
                  href={`/customers/${customer.id}`}
                  className="font-medium hover:underline"
                >
                  {customer.name}
                </Link>
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {customer.email || "—"}
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {customer.phone || "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    CUSTOMER_TYPE_BADGE[customer.customer_type]
                  )}
                >
                  {customer.customer_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                {customer.loyalty_points}
              </TableCell>
              <TableCell className="text-right hidden lg:table-cell">
                {customer.total_orders}
              </TableCell>
              <TableCell className="text-right hidden lg:table-cell font-medium">
                {formatCurrency(customer.total_spent)}
              </TableCell>
              <TableCell>
                <EntityActionDropdown
                  viewHref={`/customers/${customer.id}`}
                  viewLabel="View Details"
                  editHref={`/customers/${customer.id}/edit`}
                  onAction={onDelete ? () => onDelete(customer) : undefined}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
