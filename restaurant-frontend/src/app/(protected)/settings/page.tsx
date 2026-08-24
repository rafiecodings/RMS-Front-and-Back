"use client";

import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Settings,
} from "lucide-react";
import { SettingsSidebar } from "@/features/settings";
import Link from "next/link";

const SETTINGS_SECTIONS = [
  {
    title: "Restaurant Information",
    description: "Name, address, contact details, and business hours",
    icon: Building2,
    href: "/settings/restaurant",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    title: "System Preferences",
    description: "Global settings, receipt templates, and timeouts",
    icon: Settings,
    href: "/settings/preferences",
    color: "text-rose-600",
    bgColor: "bg-rose-50",
  },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      <aside className="w-full lg:w-56 lg:shrink-0">
        <SettingsSidebar />
      </aside>
      <main className="flex-1 space-y-6">
        <PageHeader
          title="Settings"
          description="Manage your restaurant configuration"
        />
        <div className="grid gap-4 md:grid-cols-2">
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.href} href={section.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className={`rounded-lg p-2 ${section.bgColor}`}>
                      <Icon className={`h-5 w-5 ${section.color}`} />
                    </div>
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
      </main>
    </div>
  );
}
