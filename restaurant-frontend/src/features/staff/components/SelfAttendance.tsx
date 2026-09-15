"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useClockIn, useClockOut, useCurrentStaff } from "@/lib/hooks/useStaff";
import { ClockInOutButton } from "./ClockInOutButton";
import { toast } from "sonner";
import { isAxiosError } from "axios";

export function SelfAttendance() {
  const profile = useCurrentStaff();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const staff = profile.data;
  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false);

  if (profile.isLoading) return <p role="status">Loading your attendance...</p>;
  if (profile.isError) return (
    <div role="alert">
      <p>Unable to load your attendance.</p>
      <Button variant="outline" onClick={() => profile.refetch()}>Retry</Button>
    </div>
  );
  if (!staff) return <p role="status">No staff profile is linked to your account. Ask an admin or manager to link your profile.</p>;

  const active = staff.active_attendance;
  function handleClockIn() {
    if (!staff || !staff.is_active) return;
    clockIn.mutate({ staff_id: staff.id }, {
      onSuccess: () => toast.success("Clocked in successfully"),
      onError: (error: Error) => {
        toast.error((isAxiosError(error) && error.response?.data?.message) || error.message || "Unable to record attendance");
        void profile.refetch();
      },
    });
  }

  function handleClockOutConfirm() {
    if (!staff || !active) return;
    clockOut.mutate({ staff_id: staff.id }, {
      onSuccess: () => {
        toast.success("Clocked out successfully");
        setShowClockOutConfirm(false);
      },
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
          onClockIn={handleClockIn}
          onClockOut={() => setShowClockOutConfirm(true)}
          isLoading={profile.isFetching || clockIn.isPending || clockOut.isPending}
        />
      )}

      <Dialog open={showClockOutConfirm} onOpenChange={setShowClockOutConfirm}>
        <DialogContent className="sm:max-w-[420px] w-[calc(100vw-1.5rem)]">
          <DialogHeader>
            <DialogTitle>Clock Out?</DialogTitle>
            <DialogDescription>Confirm you want to end your current shift.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowClockOutConfirm(false)} disabled={clockOut.isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleClockOutConfirm} disabled={clockOut.isPending}>{clockOut.isPending ? "Clocking out..." : "Confirm Clock Out"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
