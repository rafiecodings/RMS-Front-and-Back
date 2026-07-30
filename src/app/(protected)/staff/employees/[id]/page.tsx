"use client";

import { useParams } from "next/navigation";
import { EmptyState, LoadingSpinner } from "@/components/shared";
import { StaffDetail, PerformanceCard } from "@/features/staff";
import { useStaff, useStaffPerformance } from "@/lib/hooks";

export default function EmployeeDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { list } = useStaff({ per_page: 200 });
  const staffList = list.data?.data?.data ?? [];
  const staff = staffList.find((s) => s.id === id);

  const { data: performance, isLoading: perfLoading } = useStaffPerformance(id);

  if (list.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!staff) {
    return (
      <EmptyState
        title="Staff member not found"
        description="This staff member may have been removed."
      />
    );
  }

  return (
    <div className="space-y-6">
      <StaffDetail staff={staff} />

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Performance Metrics
        </h3>
        <PerformanceCard performance={performance} isLoading={perfLoading} />
      </div>
    </div>
  );
}
