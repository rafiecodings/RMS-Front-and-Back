"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, Receipt, CalendarCheck } from "lucide-react";
import type { Customer } from "@/lib/types";

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

export function CustomerStats({ customers }: { customers: Customer[] }) {
  const total = customers.length;
  const active = customers.filter((c) => c.is_active).length;
  const totalOrders = customers.reduce((sum, c) => sum + (c.total_orders ?? 0), 0);
  const totalReservations = customers.reduce(
    (sum, c) => sum + (c.total_reservations ?? 0),
    0
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Customers"
        value={String(total)}
        icon={Users}
        iconColor="bg-blue-500/10 text-blue-600"
      />
      <StatCard
        title="Active Customers"
        value={String(active)}
        icon={UserCheck}
        iconColor="bg-emerald-500/10 text-emerald-600"
      />
      <StatCard
        title="Total Orders"
        value={String(totalOrders)}
        icon={Receipt}
        iconColor="bg-violet-500/10 text-violet-600"
      />
      <StatCard
        title="Total Reservations"
        value={String(totalReservations)}
        icon={CalendarCheck}
        iconColor="bg-amber-500/10 text-amber-600"
      />
    </div>
  );
}

