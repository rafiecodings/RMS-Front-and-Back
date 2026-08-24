"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShiftScheduleTable, ShiftForm, RoleBadge } from "@/features/staff";
import { useStaff, useShiftSchedule } from "@/lib/hooks";
import { toast } from "sonner";
import type { ShiftSchedule, Staff, ShiftScheduleFormData } from "@/lib/types";

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
}

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState<Date | null>(() => getMonday(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [viewShift, setViewShift] = useState<{ shift: ShiftSchedule; staffMember?: Staff } | null>(null);

  const weekEnd = weekStart ? new Date(weekStart) : new Date();
  if (weekStart) {
    weekEnd.setDate(weekEnd.getDate() + 6);
  }

  const { list: staffList } = useStaff({ per_page: 200 });
  const staff = staffList.data?.data?.data ?? [];

  const dateRange = weekStart
    ? {
        start_date: weekStart.toISOString().split("T")[0],
        end_date: weekEnd.toISOString().split("T")[0],
      }
    : { start_date: "", end_date: "" };

  const { list: shiftsList, create } = useShiftSchedule({
    ...dateRange,
    per_page: 200,
  });
  const shifts = shiftsList.data?.data?.data ?? [];

  function handleAddShift(data: ShiftScheduleFormData) {
    create.mutate(data, {
      onSuccess: () => {
        toast.success("Shift added successfully");
        setShowForm(false);
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to add shift");
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shift Schedule"
        description="Manage weekly staff shift assignments"
      />

      {weekStart && (
        <>
          <ShiftScheduleTable
            shifts={shifts}
            staff={staff}
            isLoading={shiftsList.isLoading}
            weekStart={weekStart}
            onWeekChange={setWeekStart}
            onAddShift={() => setShowForm(true)}
            onViewSchedule={(shift, staffMember) => setViewShift({ shift, staffMember })}
          />

          {/* View Schedule modal (backend has no schedule update/delete yet) */}
        <Dialog
          open={!!viewShift}
          onOpenChange={(open) => {
            if (!open) setViewShift(null);
          }}
        >
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Shift Details</DialogTitle>
            </DialogHeader>
            {viewShift && (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Staff</span>
                  <span className="font-medium flex items-center gap-2">
                    {viewShift.staffMember?.user?.name ?? "—"}
                    {viewShift.staffMember?.user?.role && (
                      <RoleBadge role={viewShift.staffMember.user.role as never} />
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{viewShift.shift.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Shift</span>
                  <span className="font-medium">{viewShift.shift.shift?.name ?? "—"}</span>
                </div>
                {viewShift.shift.shift?.start_time && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-medium">
                      {viewShift.shift.shift.start_time} – {viewShift.shift.shift.end_time}
                    </span>
                  </div>
                )}
                {viewShift.shift.notes && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">Notes</span>
                    <span>{viewShift.shift.notes}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">{viewShift.shift.status}</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        </>
      )}

      <Dialog open={showForm && !!weekStart} onOpenChange={(open) => { if (!open) setShowForm(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Shift</DialogTitle>
          </DialogHeader>
          {weekStart && (
            <div className="space-y-4">
              <ShiftForm
                staffList={staff}
                onSubmit={handleAddShift}
                isLoading={create.isPending}
                defaultDate={weekStart.toISOString().split("T")[0]}
              />
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
