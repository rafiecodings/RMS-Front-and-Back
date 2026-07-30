"use client";

import { PageHeader } from "@/components/shared";
import { SettingsSidebar, RoleTable, PermissionMatrix } from "@/features/settings";

export default function RolesSettingsPage() {
  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      <aside className="w-full lg:w-56 lg:shrink-0">
        <SettingsSidebar />
      </aside>
      <main className="flex-1 space-y-6">
        <PageHeader
          title="Roles & Permissions"
          description="Configure roles and RBAC permissions"
        />
        <RoleTable />
        <PermissionMatrix />
      </main>
    </div>
  );
}
