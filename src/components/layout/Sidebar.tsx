"use client";

import { NavLinks, SidebarLogo, useSidebarCollapsed } from "./SidebarNav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

// Desktop Sidebar - persistent on desktop, hidden on mobile.
// Collapsible to an icon-only rail via the hamburger control; state
// persisted locally.
export function Sidebar() {
  const { collapsed, toggle } = useSidebarCollapsed();

  return (
    <aside
      className={cn(
        "hidden lg:flex lg:flex-col border-r bg-card transition-[width] duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarLogo collapsed={collapsed} />
      <NavLinks collapsed={collapsed} />
      <div className="flex justify-center border-t p-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    </aside>
  );
}
