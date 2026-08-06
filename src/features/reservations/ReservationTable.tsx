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
import { XCircle, Users, Clock } from "lucide-react";
import type { Reservation, ReservationStatus } from "@/lib/types";
import { cn, formatLabel } from "@/lib/utils";

const STATUS_BADGE: Record<ReservationStatus, string> = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  confirmed:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  seated:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  no_show:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  cancelled:
    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

function formatDate(dateStr: string | undefined | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeStr: string | undefined | null) {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h ?? "0") || 0;
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m ?? "00"} ${ampm}`;
}

interface ReservationTableProps {
  reservations: Reservation[];
  isLoading?: boolean;
  onCancel?: (reservation: Reservation) => void;
}

export function ReservationTable({
  reservations,
  isLoading,
  onCancel,
}: ReservationTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">No reservations found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reservation</TableHead>
            <TableHead className="hidden md:table-cell">Customer</TableHead>
            <TableHead>Date & Time</TableHead>
            <TableHead className="text-center">Party</TableHead>
            <TableHead className="hidden lg:table-cell">Table</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((res) => (
            <TableRow key={res.id}>
              <TableCell>
                <Link
                  href={`/reservations/${res.id}`}
                  className="font-semibold hover:underline text-sm"
                >
                  {res.reservation_number}
                </Link>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div>
                  <p className="text-sm font-medium">{res.customer?.name ?? res.guest_name}</p>
                  {res.customer?.phone && (
                    <p className="text-xs text-muted-foreground">
                      {res.customer.phone}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{formatDate(res.reservation_date)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(res.reservation_time)}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center gap-1 text-sm">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  {res.party_size}
                </span>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm">
                {res.table ? res.table.number : "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    STATUS_BADGE[res.status] ?? STATUS_BADGE["pending"],
                  )}
                >
                  {formatLabel(res.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <EntityActionDropdown
                  viewHref={`/reservations/${res.id}`}
                  viewLabel="View Details"
                  editHref={(res.status === "pending" || res.status === "confirmed") ? `/reservations/${res.id}/edit` : undefined}
                  onAction={(onCancel && res.status !== "cancelled" && res.status !== "completed") ? () => onCancel(res) : undefined}
                  actionLabel="Cancel"
                  actionIcon={XCircle}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
