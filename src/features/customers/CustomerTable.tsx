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
import { LoadingSpinner, EmptyState } from "@/components/shared";
import { EntityActionDropdown } from "@/components/shared";
import { Users } from "lucide-react";
import type { Customer } from "@/lib/types";
import { cn } from "@/lib/utils";

const CUSTOMER_TYPE_BADGE: Record<string, string> = {
  walk_in: "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300",
};

interface CustomerTableProps {
  customers: Customer[];
  isLoading?: boolean;
  onDelete?: (customer: Customer) => void;
  onArchive?: (customer: Customer) => void;
  canEdit?: boolean;
}

export function CustomerTable({
  customers,
  isLoading,
  onDelete,
  onArchive,
  canEdit = true,
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
      <EmptyState
        title="No customers found"
        description="No customers match your current search or filters."
        icon={<Users className="h-8 w-8" />}
      />
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Orders</TableHead>
            <TableHead className="text-right">Visits</TableHead>
            <TableHead>Status</TableHead>
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
              <TableCell>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    CUSTOMER_TYPE_BADGE[customer.customer_type] ?? CUSTOMER_TYPE_BADGE.walk_in
                  )}
                >
                  {customer.customer_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {customer.total_orders}
              </TableCell>
              <TableCell className="text-right">
                {customer.visit_count ?? 0}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    customer.is_active
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-400"
                  )}
                >
                  {customer.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
<TableCell>
                <EntityActionDropdown
                  viewHref={`/customers/${customer.id}`}
                  viewLabel="View Details"
                  editHref={canEdit ? `/customers/${customer.id}/edit` : undefined}
                  onAction={onDelete ? () => onDelete(customer) : undefined}
                  onArchive={onArchive ? () => onArchive(customer) : undefined}
                  archiveLabel="Archive"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}


