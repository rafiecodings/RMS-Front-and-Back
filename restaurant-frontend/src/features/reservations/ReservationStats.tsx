"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CalendarCheck, Clock, TriangleAlert, XCircle, Users } from "lucide-react";
import type { Reservation } from "@/lib/types";

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}) {
  return (
    <Card>
      <CardContent className="pt-1">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReservationStats({
  reservations,
  total,
}: {
  reservations: Reservation[];
  total?: number;
}) {
  const today = new Date().toISOString().split("T")[0];

  // Total reflects server-side meta (all pages) when provided; other figures
  // describe the currently loaded slice.
  const totalCount = total ?? reservations.length;
  const todayCount = reservations.filter(
    (r) => r.reservation_date === today
  ).length;
  const pending = reservations.filter((r) => r.status === "pending").length;
  const seated = reservations.filter((r) => r.status === "seated").length;
  const cancelled = reservations.filter(
    (r) => r.status === "cancelled"
  ).length;

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
      <StatCard
        title="Total"
        value={String(totalCount)}
        icon={CalendarCheck}
        iconColor="bg-blue-500/10 text-blue-600"
      />
      <StatCard
        title="Today"
        value={String(todayCount)}
        icon={Clock}
        iconColor="bg-purple-500/10 text-purple-600"
      />
      <StatCard
        title="Pending"
        value={String(pending)}
        icon={TriangleAlert}
        iconColor="bg-amber-500/10 text-amber-600"
      />
      <StatCard
        title="Seated"
        value={String(seated)}
        icon={Users}
        iconColor="bg-emerald-500/10 text-emerald-600"
      />
      <StatCard
        title="Cancelled"
        value={String(cancelled)}
        icon={XCircle}
        iconColor="bg-red-500/10 text-red-600"
      />
    </div>
  );
}
