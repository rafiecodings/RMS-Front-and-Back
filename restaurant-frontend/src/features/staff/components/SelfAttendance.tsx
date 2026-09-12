"use client";

import { Button } from "@/components/ui/button";
import { useClockIn, useClockOut, useCurrentStaff } from "@/lib/hooks/useStaff";
import { ClockInOutButton } from "./ClockInOutButton";
import { toast } from "sonner";
import { isAxiosError } from "axios";

export function SelfAttendance() {
  const profile = useCurrentStaff();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const staff = profile.data;

  if (profile.isLoading) return <p role="status">Loading your attendance...</p>;
  if (profile.isError) return (
    <div role="alert">
      <p>Unable to load your attendance.</p>
      <Button variant="outline" onClick={() => profile.refetch()}>Retry</Button>
    </div>
  );
  if (!staff) return <p role="status">No staff profile is linked to your account. Ask an admin or manager to link your profile.</p>;

  const active = staff.active_attendance;
  function punch() {
    if (!staff || (!active && !staff.is_active)) return;
    const mutation = active ? clockOut : clockIn;
    mutation.mutate({ staff_id: staff.id }, {
      onSuccess: () => toast.success(active ? "Clocked out successfully" : "Clocked in successfully"),
      onError: (error: Error) => {
        toast.error((isAxiosError(error) && error.response?.data?.message) || error.message || "Unable to record attendance");
        void profile.refetch();
      },
    });
  }

  return (
    <section aria-label="Your attendance" className="rounded-lg border bg-card p-4 space-y-3">
      <p className="font-medium">{staff.employee_id}{staff.user?.name ? ` — ${staff.user.name}` : ""}</p>
      <p>{active ? `Clocked in since ${new Date(active.clock_in).toLocaleString("en-PH")}` : "You are clocked out."}</p>
      {!staff.is_active && <p role="status">Your staff profile is inactive. You cannot clock in. You can still clock out of an open shift.</p>}
      {(active || staff.is_active) && (
        <ClockInOutButton
          isClockedIn={!!active}
          onClockIn={punch}
          onClockOut={punch}
          isLoading={profile.isFetching || clockIn.isPending || clockOut.isPending}
        />
      )}
    </section>
  );
}
