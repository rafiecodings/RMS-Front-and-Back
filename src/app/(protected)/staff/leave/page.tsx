"use client";

import { PageHeader } from "@/components/shared";
import { LeaveQueue } from "@/features/staff";
import { useAuth } from "@/providers/AuthProvider";

export default function StaffLeavePage() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";
  if (!canManage) {
    return (
      <div className="space-y-6">
        <PageHeader title="Leave Requests" description="Staff leave management" />
        <p role="alert">You do not have permission to view this page.</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Leave Requests" description="Review and approve staff leave" />
      <LeaveQueue />
    </div>
  );
}
