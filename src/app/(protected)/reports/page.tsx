"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  ShoppingCart,
  UtensilsCrossed,
  Package,
  Users,
  Receipt,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { ReportFilters } from "@/features/reports";
import type { ReportPeriod, DateRange } from "@/features/reports/types";

const REPORT_TYPES = [
  {
    title: "Revenue Reports",
    description: "Sales, revenue, and profit analysis",
    icon: DollarSign,
    href: "/reports/revenue",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    title: "Sales Reports",
    description: "Sales breakdown by category, item, and time",
    icon: ShoppingCart,
    href: "/reports/sales",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
  {
    title: "Menu Performance",
    description: "Item performance and margin analysis",
    icon: UtensilsCrossed,
    href: "/reports/menu",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  {
    title: "Inventory Reports",
    description: "Stock valuation and consumption variance",
    icon: Package,
    href: "/reports/inventory",
    color: "text-rose-600",
    bgColor: "bg-rose-50",
  },
  {
    title: "Staff Reports",
    description: "Productivity, attendance, and labor cost",
    icon: Users,
    href: "/reports/staff",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    title: "Tax Reports",
    description: "Tax collected and compliance reports",
    icon: Receipt,
    href: "/reports/tax",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
];

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive reports and business intelligence"
      />

      <ReportFilters
        period={period}
        dateRange={dateRange}
        onPeriodChange={setPeriod}
        onDateRangeChange={setDateRange}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REPORT_TYPES.map((report) => {
          const Icon = report.icon;
          return (
            <Link key={report.href} href={report.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className={`rounded-lg p-2 ${report.bgColor}`}>
                    <Icon className={`h-5 w-5 ${report.color}`} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {report.description}
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
