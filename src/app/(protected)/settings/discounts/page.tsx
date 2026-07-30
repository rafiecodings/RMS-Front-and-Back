"use client";

import { PageHeader } from "@/components/shared";
import { SettingsSidebar, DiscountTable } from "@/features/settings";

export default function DiscountsSettingsPage() {
  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      <aside className="w-full lg:w-56 lg:shrink-0">
        <SettingsSidebar />
      </aside>
      <main className="flex-1 space-y-6">
        <PageHeader
          title="Discounts"
          description="Manage promotional discounts and promo codes"
        />
        <DiscountTable />
      </main>
    </div>
  );
}
