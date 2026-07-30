"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { ShiftScheduleTable, ShiftForm } from "@/features/staff";
import { useStaff, useShiftSchedule } from "@/lib/hooks";
import { toast } from "sonner";
import type { ShiftScheduleFormData } from "@/lib/types";

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
}

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [showForm, setShowForm] = useState(false);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const { list: staffList } = useStaff({ per_page: 200 });
  const staff = staffList.data?.data?.data ?? [];

  const { list: shiftsList, create } = useShiftSchedule({
    date_from: weekStart.toISOString().split("T")[0],
    date_to: weekEnd.toISOString().split("T")[0],
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

      <ShiftScheduleTable
        shifts={shifts}
        staff={staff}
        isLoading={shiftsList.isLoading}
        weekStart={weekStart}
        onWeekChange={setWeekStart}
        onAddShift={() => setShowForm(true)}
      />

      {showForm && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            New Shift
          </h3>
          <ShiftForm
            staffList={staff}
            onSubmit={handleAddShift}
            isLoading={create.isPending}
            defaultDate={weekStart.toISOString().split("T")[0]}
          />
          <div className="flex justify-end">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
