"use client";

import { NotificationMenu } from "@/components/layout/NotificationMenu";
import { UserMenu } from "@/components/layout/UserMenu";
import { MobileSidebar } from "@/components/layout/Sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Search, Command, Maximize2, Minimize2, Sun, Moon } from "lucide-react";
import { useState, useCallback } from "react";
import { useTheme } from "next-themes";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useState(() => setMounted(true));

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="text-muted-foreground hover:text-foreground"
    >
      {mounted && theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggle = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="text-muted-foreground hover:text-foreground"
    >
      {isFullscreen ? (
        <Minimize2 className="h-4 w-4" />
      ) : (
        <Maximize2 className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle fullscreen</span>
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

      {/* Center: Search */}
      <div className="hidden md:flex flex-1 items-center justify-center px-4 lg:px-8">
        <div className="relative w-full max-w-[650px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search orders, customers, menu..."
            className="w-full h-9 rounded-xl border border-input bg-muted/50 pl-9 pr-10 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:bg-background placeholder:text-muted-foreground"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex items-center gap-0.5 rounded-md border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
            <Command className="h-2.5 w-2.5" />
            K
          </kbd>
        </div>
      </div>

      {/* Right: Actions + Profile */}
      <div className="flex items-center gap-0.5 ml-auto shrink-0">
        <ThemeToggle />
        <FullscreenToggle />
        <NotificationMenu />
        <Separator orientation="vertical" className="h-8 mx-1.5" />
        <UserMenu />
      </div>
    </header>
  );
}
