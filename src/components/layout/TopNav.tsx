"use client";

import { NotificationMenu } from "@/components/layout/NotificationMenu";
import { UserMenu } from "@/components/layout/UserMenu";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Separator } from "@/components/ui/separator";

export function TopNav() {
  return (
    <header className="flex items-center h-16 px-4 lg:px-6 border-b bg-card gap-2">
      {/* Left: Mobile controls */}
      <div className="flex items-center gap-2 shrink-0">
        <MobileSidebar />
        <Separator orientation="vertical" className="h-6 lg:hidden" />
      </div>

      {/* Right: Actions + Profile */}
      <div className="flex items-center gap-0.5 ml-auto shrink-0">
        <ThemeToggle />
        <NotificationMenu />
        <Separator orientation="vertical" className="h-8 mx-1.5" />
        <UserMenu />
      </div>
    </header>
  );
}