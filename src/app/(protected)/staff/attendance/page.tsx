"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { AttendanceTable } from "@/features/staff";
import { useAttendance, useCloseAttendance } from "@/lib/hooks";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";
import type { AttendanceRecord } from "@/lib/types";

export default function AttendancePage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [today] = useState(() => new Date().toISOString().split("T")[0]);
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";
  const [staleSelected, setStaleSelected] = useState<AttendanceRecord | null>(null);
  const [closeForm, setCloseForm] = useState({ clock_out: "", reason: "" });
  const closeMut = useCloseAttendance();

  const attendanceQuery = useAttendance({
    page,
    per_page: 20,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    date: today,
  });

  const staleQuery = useAttendance({ per_page: 50 });
  // eslint-disable-next-line react-hooks/purity
  const staleThreshold = Date.now() - 24 * 60 * 60 * 1000;
  const staleRecords = canManage
    ? (staleQuery.data?.data?.data ?? []).filter((r) => !r.clock_out && new Date(r.clock_in).getTime() < staleThreshold)
    : [];

  const records = attendanceQuery.data?.data?.data ?? [];
  const totalPages = attendanceQuery.data?.data?.meta?.last_page ?? 1;

  const todayDisplay = new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  function openStale(r: AttendanceRecord) {
    setStaleSelected(r);
    setCloseForm({ clock_out: "", reason: "" });
  }

  function handleStaleClose(e: React.FormEvent) {
    e.preventDefault();
    if (!staleSelected || !closeForm.clock_out || !closeForm.reason) return;
    const iso = new Date(closeForm.clock_out).toISOString();
    closeMut.mutate({ id: staleSelected.id, clock_out: iso, reason: closeForm.reason }, {
      onSuccess: () => { toast.success("Attendance closed"); setStaleSelected(null); },
      onError: (err: Error) => toast.error(err.message || "Failed to close"),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Track staff attendance and clock in/out"
      />

      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Today: {todayDisplay}
        </p>
      </div>

      {canManage && staleRecords.length > 0 && (
        <section aria-label="Stale attendance" className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="font-medium text-sm">Stale Open Attendance ( &gt;24h )</h3>
          <ul className="divide-y text-sm">
            {staleRecords.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 py-2">
                <span className="font-medium">{r.staff?.employee_id}{r.staff?.name ? ` — ${r.staff.name}` : ""}</span>
                <span className="text-muted-foreground text-xs">{new Date(r.clock_in).toLocaleString("en-PH")}</span>
                <Button size="sm" variant="outline" onClick={() => openStale(r)}>Close</Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={!!staleSelected} onOpenChange={(open) => { if (!open) setStaleSelected(null); }}>
        <DialogContent className="sm:max-w-[520px] w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>Close Stale Attendance</DialogTitle>
            <DialogDescription>Provide closing time and reason for this open shift</DialogDescription>
          </DialogHeader>
          {staleSelected && (
            <form onSubmit={handleStaleClose} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto overflow-x-hidden flex-1 px-6 py-5 space-y-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Employee</span>
                  <span className="font-medium">{staleSelected.staff?.employee_id}{staleSelected.staff?.name ? ` — ${staleSelected.staff.name}` : ""}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Clock In</span>
                  <span className="font-medium">{new Date(staleSelected.clock_in).toLocaleString("en-PH")}</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stale-clock-out" className="text-sm font-medium">Clock Out *</Label>
                  <Input id="stale-clock-out" type="datetime-local" value={closeForm.clock_out} onChange={(e) => setCloseForm((p) => ({ ...p, clock_out: e.target.value }))} required className="w-full" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stale-reason" className="text-sm font-medium">Reason *</Label>
                  <Textarea id="stale-reason" value={closeForm.reason} onChange={(e) => setCloseForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Reason for closing" required rows={3} className="min-h-[80px] resize-y w-full" />
                </div>
              </div>
              <div className="shrink-0 border-t bg-muted/30 px-6 py-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setStaleSelected(null)} disabled={closeMut.isPending}>Cancel</Button>
                <Button type="submit" disabled={closeMut.isPending || !closeForm.clock_out || !closeForm.reason}>{closeMut.isPending ? "Closing..." : "Confirm Close"}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {attendanceQuery.isError && <p role="alert">Unable to load attendance records.</p>}
      <AttendanceTable
        records={records}
        isLoading={attendanceQuery.isLoading}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        statusFilter={statusFilter}
        onStatusFilterChange={(v) => { setStatusFilter(v); setPage(1); }}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
