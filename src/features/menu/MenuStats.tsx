"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  UtensilsCrossed,
  CheckCircle,
  XCircle,
  Leaf,
  DollarSign,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { MenuItem } from "@/lib/types";

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

export function MenuStats({ items }: { items: MenuItem[] }) {
  const total = items.length;
  const available = items.filter((i) => i.is_available).length;
  const unavailable = total - available;
  const vegetarian = items.filter((i) => i.is_vegetarian || i.is_vegan).length;
  const avgPrice =
    total > 0
      ? items.reduce((sum, i) => sum + i.price, 0) / total
      : 0;

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
      <StatCard
        title="Total Items"
        value={String(total)}
        icon={UtensilsCrossed}
        iconColor="bg-blue-500/10 text-blue-600"
      />
      <StatCard
        title="Available"
        value={String(available)}
        icon={CheckCircle}
        iconColor="bg-emerald-500/10 text-emerald-600"
      />
      <StatCard
        title="Unavailable"
        value={String(unavailable)}
        icon={XCircle}
        iconColor="bg-red-500/10 text-red-600"
      />
      <StatCard
        title="Vegetarian/Vegan"
        value={String(vegetarian)}
        icon={Leaf}
        iconColor="bg-green-500/10 text-green-600"
      />
      <StatCard
        title="Avg Price"
        value={formatCurrency(avgPrice)}
        icon={DollarSign}
        iconColor="bg-amber-500/10 text-amber-600"
      />
    </div>
  );
}
