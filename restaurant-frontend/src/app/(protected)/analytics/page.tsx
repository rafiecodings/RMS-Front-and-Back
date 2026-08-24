"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  ShoppingCart,
  Clock,
  Package,
  Users,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { AnalyticsFilter } from "@/features/analytics";
import type { AnalyticsPeriod, DateRange } from "@/features/analytics/types";

const ANALYTICS_SECTIONS = [
  {
    title: "Revenue Analytics",
    description: "Revenue trends, comparisons, and breakdown analysis",
    icon: DollarSign,
    href: "/analytics/revenue",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    title: "Sales Trends",
    description: "Sales performance, category breakdown, and best sellers",
    icon: ShoppingCart,
    href: "/analytics/sales",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
  {
    title: "Peak Hours",
    description: "Busy hours heatmap and hourly distribution patterns",
    icon: Clock,
    href: "/analytics/peak-hours",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  {
    title: "Inventory Usage",
    description: "Ingredient consumption, wastage tracking, and alerts",
    icon: Package,
    href: "/analytics/inventory",
    color: "text-rose-600",
    bgColor: "bg-rose-50",
  },
  {
    title: "Customer Analytics",
    description: "Visit patterns, customer segments, and loyalty insights",
    icon: Users,
    href: "/analytics/customers",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Interactive business intelligence and insights"
      />

      <AnalyticsFilter
        period={period}
        dateRange={dateRange}
        onPeriodChange={setPeriod}
        onDateRangeChange={setDateRange}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ANALYTICS_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className={`rounded-lg p-2 ${section.bgColor}`}>
                    <Icon className={`h-5 w-5 ${section.color}`} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {section.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
