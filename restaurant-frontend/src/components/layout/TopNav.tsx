"use client";

import { NotificationMenu } from "@/components/layout/NotificationMenu";
import { UserMenu } from "@/components/layout/UserMenu";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useThemeContext } from "@/providers/ThemeProvider";

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useThemeContext();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="text-muted-foreground hover:text-foreground"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

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