"use client";

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { NavLinks, SidebarLogo } from "./SidebarNav";

export function MobileSidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open navigation</span>
          </button>
        }
      />
      <SheetContent side="left" className="w-[85vw] max-w-72 p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarLogo />
        <NavLinks onNavigate={onNavigate} />
      </SheetContent>
    </Sheet>
  );
}