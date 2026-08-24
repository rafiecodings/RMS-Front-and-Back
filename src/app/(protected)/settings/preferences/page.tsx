"use client";

import { PageHeader } from "@/components/shared";
import { SettingsSidebar, SystemPreferences } from "@/features/settings";
import { useAuth } from "@/providers/AuthProvider";

export default function PreferencesSettingsPage() {
  const { user } = useAuth();
  // Policy: Admin edits; Manager/others view-only (backend PUT is role:admin).
  const canEditSettings = user?.role === "admin";

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      <aside className="w-full lg:w-56 lg:shrink-0">
        <SettingsSidebar />
      </aside>
      <main className="flex-1 space-y-6">
        <PageHeader
          title="System Preferences"
          description="Global settings, receipt templates, and timeouts"
        />
        <SystemPreferences canEdit={canEditSettings} />
      </main>
    </div>
  );
}
