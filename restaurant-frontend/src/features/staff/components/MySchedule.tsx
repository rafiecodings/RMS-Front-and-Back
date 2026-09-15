"use client";

import { useCurrentStaff, useShiftSchedule } from "@/lib/hooks/useStaff";
import { Badge } from "@/components/ui/badge";

function formatFriendlyDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Self-service schedule view for operational staff.
 * Read-only: shows ONLY the authenticated user's own assignments.
 * No management controls, no edit/delete, no other employees.
 */
function OwnScheduleList({ staffId }: { staffId: string }) {
  const { list: schedules } = useShiftSchedule({ staff_id: staffId, per_page: 50 });
  const items = schedules.data?.data?.data ?? [];
  const ownOnly = items.filter((s) => s.staff_id === staffId);

  if (schedules.isLoading) return <p role="status">Loading shifts...</p>;
  if (schedules.isError) return <p role="alert">Unable to load shifts.</p>;
  if (ownOnly.length === 0)
    return <p className="text-sm text-muted-foreground">No shifts scheduled.</p>;

  return (
    <ul className="divide-y text-sm">
      {ownOnly.map((s) => (
        <li key={s.id} className="flex items-center justify-between gap-4 py-2">
          <span className="font-medium">{formatFriendlyDate(s.date)}</span>
          <span>
            {s.shift?.name ?? "Shift"}
            {s.shift?.start_time ? ` (${s.shift.start_time.slice(0, 5)} - ${s.shift.end_time.slice(0, 5)})` : ""}
          </span>
          <Badge variant="outline" className="capitalize">{formatStatus(s.status)}</Badge>
        </li>
      ))}
    </ul>
  );
}

export function MySchedule() {
  const profile = useCurrentStaff();
  const staffId = profile.data?.id;

  if (profile.isLoading) return <p role="status">Loading your schedule...</p>;
  if (profile.isError)
    return (
      <div role="alert">
        <p>Unable to load your schedule.</p>
      </div>
    );
  if (!staffId)
    return (
      <p role="status">
        No staff profile is linked to your account. Ask an admin or manager to link your profile.
      </p>
    );

  return (
    <section aria-label="My schedule" className="rounded-lg border bg-card p-4 space-y-3">
      <h2 className="font-medium">My Schedule</h2>
      <OwnScheduleList staffId={staffId} />
    </section>
  );
}
