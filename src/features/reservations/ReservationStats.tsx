"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CalendarCheck, Clock, Users, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
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
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconColor}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReservationStats({ reservations }: { reservations: Reservation[] }) {
  const today = new Date().toISOString().split("T")[0];

  const total = reservations.length;
  const todayCount = reservations.filter((r) => r.reservation_date === today).length;
  const pending = reservations.filter((r) => r.status === "pending").length;
  const confirmed = reservations.filter((r) => r.status === "confirmed").length;
  const cancelled = reservations.filter((r) => r.status === "cancelled").length;
  const noShow = reservations.filter((r) => r.status === "no_show").length;

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
      <StatCard
        title="Total"
        value={String(total)}
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
        icon={AlertTriangle}
        iconColor="bg-amber-500/10 text-amber-600"
      />
      <StatCard
        title="Confirmed"
        value={String(confirmed)}
        icon={CheckCircle}
        iconColor="bg-emerald-500/10 text-emerald-600"
      />
      <StatCard
        title="Cancelled"
        value={String(cancelled)}
        icon={XCircle}
        iconColor="bg-red-500/10 text-red-600"
      />
      <StatCard
        title="No Show"
        value={String(noShow)}
        icon={Users}
        iconColor="bg-orange-500/10 text-orange-600"
      />
    </div>
  );
}
