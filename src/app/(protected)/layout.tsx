"use client";

import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import QueryProvider from "@/providers/QueryProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { LoadingSpinner } from "@/components/shared";

const SIDEBAR_COLLAPSED_KEY = "rms-sidebar-collapsed";

function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

let sidebarCollapsedListeners: Array<() => void> = [];

function subscribeSidebarCollapsed(callback: () => void) {
  sidebarCollapsedListeners.push(callback);
  return () => {
    sidebarCollapsedListeners = sidebarCollapsedListeners.filter((l) => l !== callback);
  };
}

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const collapsed = useSyncExternalStore(
    subscribeSidebarCollapsed,
    readSidebarCollapsed,
    () => false
  );

  const [, setCollapsedVersion] = useState(0);

  const toggleCollapse = useCallback(() => {
    const next = !readSidebarCollapsed();
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
    setCollapsedVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/20">
      <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full">
          <Breadcrumb />
          {children}
        </main>
      </div>
    </div>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <AuthProvider>
        <ProtectedContent>{children}</ProtectedContent>
      </AuthProvider>
    </QueryProvider>
  );
}
