"use client";

import { PageHeader } from "@/components/shared";
import { SettingsSidebar, RestaurantInfoForm } from "@/features/settings";
import { useAuth } from "@/providers/AuthProvider";

export default function RestaurantSettingsPage() {
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
          title="Restaurant Information"
          description="Manage your restaurant details and business information"
        />
        <RestaurantInfoForm canEdit={canEditSettings} />
      </main>
    </div>
  );
}
