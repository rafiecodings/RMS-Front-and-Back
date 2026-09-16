"use client";

import { PageHeader } from "@/components/shared";
import { SelfAttendance } from "@/features/staff/components/SelfAttendance";
import { MySchedule } from "@/features/staff";
import { MyLeave } from "@/features/staff/components/MyLeave";
import { useCurrentStaff } from "@/lib/hooks/useStaff";

export default function MyAttendancePage() {
  const profile = useCurrentStaff();

  if (profile.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Attendance" description="View your clock status and clock in or out" />
        <p role="status">Loading your attendance...</p>
      </div>
    );
  }

  if (!profile.data) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Attendance" description="View your clock status and clock in or out" />
        <p role="status">No staff profile is linked to your account. Ask an admin or manager to link your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Attendance" description="View your clock status and clock in or out" />
      <SelfAttendance />
      <MySchedule />
      <MyLeave />
    </div>
  );
}
