"use client";

import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useOptionalThemeContext } from "@/providers/ThemeProvider";
import { cn } from "@/lib/utils";

/**
 * Light/dark switch. Shared by {@link TopNav} and the auth pages so both
 * surfaces stay in sync with the same provider state.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const ctx = useOptionalThemeContext();

  // The provider withholds context until after mount, so the auth pages (which
  // prerender) get `undefined` here. Hold the button's footprint to avoid a
  // layout shift when it swaps in.
  if (!ctx) {
    return <div className={cn("size-9", className)} aria-hidden="true" />;
  }

  const { setTheme, resolvedTheme } = ctx;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={cn("text-muted-foreground hover:text-foreground", className)}
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
