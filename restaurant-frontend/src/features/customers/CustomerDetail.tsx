"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared";
import { Separator } from "@/components/ui/separator";
import {
  Pencil,
  Phone,
  Mail,
  ShoppingCart,
  Calendar,
  Clock,
  Users,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Customer, CustomerReservation } from "@/lib/types";
import { EmptyState } from "@/components/shared";

function formatTime(timeStr: string | undefined | null) {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h ?? "0") || 0;
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m ?? "00"} ${ampm}`;
}

export function CustomerDetail({
  customer,
  reservations = [],
  canEdit = false,
  onEdit,
  variant = "page",
}: {
  customer: Customer;
  reservations?: CustomerReservation[];
  canEdit?: boolean;
  onEdit?: () => void;
  variant?: "page" | "dialog";
}) {
  const upcoming = reservations.filter(
    (r) => r.status !== "cancelled" && r.status !== "completed"
  );
  const past = reservations.filter(
    (r) => r.status === "cancelled" || r.status === "completed"
  );

  return (
    <div className={variant === "dialog" ? "space-y-4" : "space-y-5"}>
      {variant === "page" && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-base font-bold">
              {customer.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold truncate">{customer.name}</h2>
                <StatusBadge
                  status={customer.is_active ? "active" : "inactive"}
                  className="text-[10px] px-1.5 py-0"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Customer since {formatDate(customer.created_at)}</p>
            </div>
          </div>
          {canEdit && (
            <Button variant="outline" size="sm" className="shrink-0" onClick={onEdit} render={onEdit ? undefined : (<Link href={`/customers/${customer.id}/edit`} /> as unknown as undefined)}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
          )}
        </div>
      )}

      <div className={variant === "dialog" ? "grid gap-4 sm:grid-cols-2" : "grid gap-4 lg:grid-cols-3"}>
        <Card className={variant === "dialog" ? "sm:col-span-2" : "lg:col-span-1"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-14 shrink-0">Phone</span>
              <span className="font-medium truncate">{customer.phone || "—"}</span>
            </div>
            {customer.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-14 shrink-0">Email</span>
                <span className="font-medium truncate">{customer.email}</span>
              </div>
            )}
            {customer.notes && (
              <>
                <Separator />
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1 text-xs">Notes</p>
                  <p className="text-sm">{customer.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

          <Card className="flex flex-col justify-center">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                  <p className="text-xl font-bold leading-none mt-1">{customer.total_orders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-center">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Total Reservations</p>
                  <p className="text-xl font-bold leading-none mt-1">{customer.total_reservations ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Reservation History */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Reservation History</h3>

        {upcoming.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcoming.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {formatDate(r.reservation_date)} at {formatTime(r.reservation_time)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{r.party_size} guests</span>
                        {r.table && (
                          <>
                            <span>·</span>
                            <span>Table {r.table.number}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={r.status} className="text-[10px] px-1.5 py-0" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {past.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Past</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {past.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {formatDate(r.reservation_date)} at {formatTime(r.reservation_time)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{r.party_size} guests</span>
                        {r.table && (
                          <>
                            <span>·</span>
                            <span>Table {r.table.number}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={r.status} className="text-[10px] px-1.5 py-0" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {reservations.length === 0 && (
          <EmptyState
            title="No reservations"
            description="This customer has no reservations yet."
            icon={<Calendar className="h-8 w-8" />}
          />
        )}
      </div>
    </div>
  );
}




