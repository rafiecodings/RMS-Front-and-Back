"use client";

import { useRef, useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { NavLinks, SidebarLogo } from "./SidebarNav";

const SCROLL_KEY = "rms-mobile-sidebar-scroll";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  function saveScroll() {
    if (typeof window === "undefined" || !navRef.current) return;
    sessionStorage.setItem(SCROLL_KEY, String(navRef.current.scrollTop));
  }

  function restoreScroll() {
    if (typeof window === "undefined" || !navRef.current) return;
    const raw = sessionStorage.getItem(SCROLL_KEY);
    if (raw !== null) {
      const v = Number(raw);
      if (Number.isFinite(v) && v >= 0) {
        requestAnimationFrame(() => {
          if (!navRef.current) return;
          const max = navRef.current.scrollHeight - navRef.current.clientHeight;
          const clamped = Math.min(v, Math.max(0, max));
          navRef.current.scrollTo({ top: clamped, behavior: "auto" });
        });
        return;
      }
    }
    requestAnimationFrame(() => {
      const el = navRef.current?.querySelector('[data-active="true"]') as HTMLElement | null;
      if (el) el.scrollIntoView({ block: "center" });
    });
  }

  function handleNavigate() {
    saveScroll();
    setOpen(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) saveScroll();
    setOpen(nextOpen);
    if (nextOpen) restoreScroll();
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
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
      <SheetContent side="left" className="w-[85vw] max-w-72 p-0 flex flex-col">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="shrink-0">
          <SidebarLogo />
        </div>
        <NavLinks onNavigate={handleNavigate} scrollRef={navRef} />
      </SheetContent>
    </Sheet>
  );
}