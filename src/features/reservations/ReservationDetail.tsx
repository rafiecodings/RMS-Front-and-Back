"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Pencil,
  User,
  Calendar,
  Clock,
  Users,
  MapPin,
  MessageSquare,
  CheckCircle,
  XCircle,
} from "lucide-react";
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
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
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

function formatDateTime(dateStr: string | undefined | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ReservationDetail({
  reservation,
  onCancel,
}: {
  reservation: Reservation;
  onCancel?: () => void;
}) {
  const canEdit = reservation.status === "pending" || reservation.status === "confirmed";
  const canCancel = reservation.status !== "cancelled" && reservation.status !== "completed";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{reservation.reservation_number}</h2>
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] px-1.5 py-0",
                STATUS_BADGE[reservation.status] ?? STATUS_BADGE["pending"],
              )}
            >
              {formatLabel(reservation.status)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Created {formatDateTime(reservation.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" render={<Link href={`/reservations/${reservation.id}/edit`} />}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
          )}
          {canCancel && onCancel && (
            <Button variant="destructive" size="sm" onClick={onCancel}>
              <XCircle className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Reservation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="text-sm font-medium">{reservation.customer?.name ?? reservation.guest_name}</p>
                  {reservation.customer?.phone && (
                    <p className="text-xs text-muted-foreground">{reservation.customer.phone}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Party Size</p>
                  <p className="text-sm font-medium">{reservation.party_size} guests</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm font-medium">{formatDate(reservation.reservation_date)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="text-sm font-medium">{formatTime(reservation.reservation_time)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Table</p>
                  <p className="text-sm font-medium">
                    {reservation.table ? `${reservation.table.number}${reservation.table.name ? ` — ${reservation.table.name}` : ""}` : "Not assigned"}
                  </p>
                </div>
              </div>
            </div>

            {reservation.special_requests && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Special Requests</p>
                    <p className="text-sm">{reservation.special_requests}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {reservation.arrival_time && (
            <Card>
              <CardContent className="pt-1">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Arrived</p>
                    <p className="text-sm font-medium">{formatDateTime(reservation.arrival_time)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {reservation.seated_time && (
            <Card>
              <CardContent className="pt-1">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Seated</p>
                    <p className="text-sm font-medium">{formatDateTime(reservation.seated_time)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {reservation.completed_time && (
            <Card>
              <CardContent className="pt-1">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                    <p className="text-sm font-medium">{formatDateTime(reservation.completed_time)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {reservation.cancellation_reason && (
            <Card>
              <CardContent className="pt-1">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cancellation Reason</p>
                    <p className="text-sm">{reservation.cancellation_reason}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
