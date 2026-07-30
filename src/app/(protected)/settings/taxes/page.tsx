"use client";

import { PageHeader } from "@/components/shared";
import { SettingsSidebar, TaxTable } from "@/features/settings";

export default function TaxesSettingsPage() {
  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      <aside className="w-full lg:w-56 lg:shrink-0">
        <SettingsSidebar />
      </aside>
      <main className="flex-1 space-y-6">
        <PageHeader
          title="Taxes"
          description="Configure tax rates and types for your restaurant"
        />
        <TaxTable />
      </main>
    </div>
  );
}
