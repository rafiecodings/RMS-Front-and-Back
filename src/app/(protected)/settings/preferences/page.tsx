"use client";

import { PageHeader } from "@/components/shared";
import { SettingsSidebar, SystemPreferences } from "@/features/settings";

export default function PreferencesSettingsPage() {
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
        <SystemPreferences />
      </main>
    </div>
  );
}
