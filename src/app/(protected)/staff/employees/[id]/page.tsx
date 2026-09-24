"use client";

import { useParams } from "next/navigation";
import { DetailPageSkeleton, EmptyState } from "@/components/shared";
import { StaffDetail, PerformanceCard } from "@/features/staff";
import { useStaffMember, useStaffPerformance } from "@/lib/hooks";
import { UserX } from "lucide-react";

export default function EmployeeDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: staff, isLoading } = useStaffMember(id);
  const { data: performance, isLoading: perfLoading } = useStaffPerformance(id);

  if (isLoading) {
    return (
      <DetailPageSkeleton />
    );
  }

  if (!staff) {
    return (
      <EmptyState
        title="Staff member not found"
        icon={<UserX className="h-8 w-8" />}
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
