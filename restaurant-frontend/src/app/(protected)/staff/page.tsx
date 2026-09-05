"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useStaff, useShiftSchedule } from "@/lib/hooks";
import { AddStaffDialog, StaffStats } from "@/features/staff";
import { Users, CalendarCheck, ClipboardList, BarChart3, ArrowRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";

export default function StaffPage() {
  const [today] = useState(() => new Date().toISOString().split("T")[0]);
  const [addOpen, setAddOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { list: staffList } = useStaff({ per_page: 200 });
  const staff = staffList.data?.data?.data ?? [];
  const activeStaff = staff.filter((s) => s.is_active);
  const avgRating = activeStaff.filter((s) => s.average_rating != null).length > 0
    ? activeStaff.reduce((sum, s) => sum + (s.average_rating ?? 0), 0) /
      activeStaff.filter((s) => s.average_rating != null).length
    : 0;

  const { list: shiftsList } = useShiftSchedule({ date: today, per_page: 200 });
  const shifts = shiftsList.data?.data?.data ?? [];
  const uniqueOnShift = new Set(shifts.map((s) => s.staff_id)).size;

  const stats = useMemo(() => ({
    totalStaff: staff.length,
    activeStaff: activeStaff.length,
    onShiftToday: uniqueOnShift,
    averageRating: avgRating,
  }), [staff.length, activeStaff.length, uniqueOnShift, avgRating]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Management"
        description="Manage employees, shifts, attendance, and performance"
        action={
          isAdmin && (
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Staff
            </Button>
          )
        }
      />

      <StaffStats stats={stats} isLoading={staffList.isLoading} />

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/staff/employees" className="group">
          <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              <Users className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Employees</h3>
              <p className="text-xs text-muted-foreground">Manage staff profiles and roles</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link href="/staff/schedule" className="group">
          <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Shift Schedule</h3>
              <p className="text-xs text-muted-foreground">View and manage weekly shifts</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link href="/staff/attendance" className="group">
          <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Attendance</h3>
              <p className="text-xs text-muted-foreground">Clock in/out and attendance records</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link href="/staff/performance" className="group">
          <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Performance</h3>
              <p className="text-xs text-muted-foreground">Staff performance metrics and analytics</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>
      {isAdmin && <AddStaffDialog open={addOpen} onOpenChange={setAddOpen} />}
    </div>
  );
}
