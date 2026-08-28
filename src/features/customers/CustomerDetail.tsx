"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Pencil,
  Phone,
  MapPin,
  ShoppingCart,
  Calendar,
  Clock,
  Users,
} from "lucide-react";
import { cn, formatDate, formatLabel } from "@/lib/utils";
import type { Customer, CustomerReservation } from "@/lib/types";
import { EmptyState } from "@/components/shared";

const RESERVATION_STATUS_BADGE: Record<string, string> = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  confirmed:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  seated:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  cancelled:
    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

function formatTime(timeStr: string | undefined | null) {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h ?? "0") || 0;
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m ?? "00"} ${ampm}`;
}

// Loyalty tiers strictly from visit_count (mirrors backend Customer::loyaltyTier()).
const LOYALTY_TIERS = [
  { name: "Member", min: 0, next: 5 },
  { name: "Bronze", min: 5, next: 10 },
  { name: "Silver", min: 10, next: 20 },
  { name: "Gold", min: 20, next: 30 },
  { name: "Platinum", min: 30, next: null },
] as const;

function loyaltyProgress(visitCount: number) {
  const idx = LOYALTY_TIERS.findIndex((t) => visitCount >= t.min);
  const tier = LOYALTY_TIERS[Math.max(idx, 0)];
  const next = LOYALTY_TIERS[Math.min(idx + 1, LOYALTY_TIERS.length - 1)];
  if (tier.next === null) {
    return { tier: tier.name, nextTier: null, pct: 100, remaining: 0 };
  }
  const span = tier.next - tier.min;
  const pct = Math.min(100, Math.round(((visitCount - tier.min) / span) * 100));
  return {
    tier: tier.name,
    nextTier: next.name,
    pct,
    remaining: Math.max(0, tier.next - visitCount),
  };
}

export function CustomerDetail({
  customer,
  reservations = [],
  canEdit = false,
}: {
  customer: Customer;
  reservations?: CustomerReservation[];
  canEdit?: boolean;
}) {
  const upcoming = reservations.filter(
    (r) => r.status !== "cancelled" && r.status !== "completed"
  );
  const past = reservations.filter(
    (r) => r.status === "cancelled" || r.status === "completed"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-lg font-bold">
            {customer.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{customer.name}</h2>
              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] px-1.5 py-0"
              >
                Registered Customer
              </Badge>
              {!customer.is_active && (
                <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0">
                  Inactive
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Customer since {formatDate(customer.created_at)}
            </p>
          </div>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" render={<Link href={`/customers/${customer.id}/edit`} />}>
            <Pencil className="h-4 w-4 mr-1.5" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-20 shrink-0">Phone</span>
              <span>{customer.phone || "—"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-20 shrink-0">Address</span>
              <span>{customer.address || "—"}</span>
            </div>
            {customer.notes && (
              <>
                <Separator />
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1">Notes</p>
                  <p>{customer.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

          <div className="space-y-4">
            <Card>
              <CardContent className="pt-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                  </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-xl font-bold">{customer.total_orders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Reservations</p>
                  <p className="text-xl font-bold">{customer.total_reservations ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Loyalty Tier</p>
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] px-1.5 py-0"
                >
                  {customer.loyalty_tier ?? loyaltyProgress(customer.visit_count).tier}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Visits</p>
                <p className="text-xl font-bold">{customer.visit_count}</p>
              </div>
              {(() => {
                const p = loyaltyProgress(customer.visit_count);
                if (p.nextTier === null) {
                  return (
                    <p className="text-xs text-muted-foreground">
                      Highest tier reached — thank you for your loyalty!
                    </p>
                  );
                }
                return (
                  <div className="space-y-1">
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${p.pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.remaining} more visit{p.remaining === 1 ? "" : "s"} to {p.nextTier}
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
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
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      RESERVATION_STATUS_BADGE[r.status] ?? "bg-gray-100 text-gray-700"
                    )}
                  >
                    {formatLabel(r.status)}
                  </Badge>
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
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      RESERVATION_STATUS_BADGE[r.status] ?? "bg-gray-100 text-gray-700"
                    )}
                  >
                    {formatLabel(r.status)}
                  </Badge>
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




