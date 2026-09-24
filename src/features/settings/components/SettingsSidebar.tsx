"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Building2, Settings, ArrowLeft } from "lucide-react";

const NAV_ITEMS = [
  { href: "/settings", label: "Overview", icon: Settings },
  { href: "/settings/restaurant", label: "Restaurant Info", icon: Building2 },
  { href: "/settings/preferences", label: "System Preferences", icon: Settings },
];

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/settings"
            ? pathname === "/settings"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
