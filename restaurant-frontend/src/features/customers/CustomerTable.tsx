"use client";

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
import { StatusBadge } from "@/components/shared";

interface CustomerTableProps {
  customers: Customer[];
  isLoading?: boolean;
  onDelete?: (customer: Customer) => void;
  onArchive?: (customer: Customer) => void;
  onEdit?: (customer: Customer) => void;
  onView?: (customer: Customer) => void;
  canEdit?: boolean;
}

export function CustomerTable({
  customers,
  isLoading,
  onDelete,
  onArchive,
  onEdit,
  onView,
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
    <>
      <div className="hidden md:block rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Reservations</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <button onClick={() => onView?.(customer)} className="font-medium hover:underline text-left">
                    {customer.name}
                  </button>
                  {(customer.phone || customer.email) && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[220px]">
                      {customer.phone ?? customer.email}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-right">{customer.total_orders}</TableCell>
                <TableCell className="text-right">{customer.total_reservations ?? 0}</TableCell>
                <TableCell>
                  <StatusBadge status={customer.is_active ? "active" : "inactive"} />
                </TableCell>
                <TableCell>
                  <EntityActionDropdown onView={onView ? () => onView(customer) : undefined} viewLabel="View Details" editHref={onEdit ? undefined : canEdit ? `/customers/${customer.id}/edit` : undefined} onEdit={onEdit ? () => onEdit(customer) : undefined} onAction={onDelete ? () => onDelete(customer) : undefined} onArchive={onArchive && customer.is_active ? () => onArchive(customer) : undefined} archiveLabel="Archive" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
<div className="md:hidden space-y-3">
        {customers.map((customer) => (
          <div key={customer.id} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <button onClick={() => onView?.(customer)} className="font-semibold hover:underline line-clamp-1 text-left">
                  {customer.name}
                </button>
                {(customer.phone || customer.email) && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {customer.phone ?? customer.email}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={customer.is_active ? "active" : "inactive"} />
                <EntityActionDropdown onView={onView ? () => onView(customer) : undefined} viewLabel="View Details" editHref={onEdit ? undefined : canEdit ? `/customers/${customer.id}/edit` : undefined} onEdit={onEdit ? () => onEdit(customer) : undefined} onAction={onDelete ? () => onDelete(customer) : undefined} onArchive={onArchive && customer.is_active ? () => onArchive(customer) : undefined} archiveLabel="Archive" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><p className="text-xs text-muted-foreground">Orders</p><p className="font-medium">{customer.total_orders}</p></div>
              <div><p className="text-xs text-muted-foreground">Reservations</p><p className="font-medium">{customer.total_reservations ?? 0}</p></div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}