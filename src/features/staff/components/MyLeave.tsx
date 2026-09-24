"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCurrentStaff, useLeaveRequests } from "@/lib/hooks/useStaff";
import { toast } from "sonner";
import type { LeaveRequest, LeaveType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  sick: "Sick Leave",
  vacation: "Vacation Leave",
  emergency: "Emergency Leave",
  unpaid: "Unpaid Leave",
  other: "Other",
};

const LEAVE_TYPES: LeaveType[] = ["sick", "vacation", "emergency", "unpaid", "other"];

function formatFriendlyDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateRange(start: string, end: string): string {
  if (start === end) return formatFriendlyDate(start);
  return `${formatFriendlyDate(start)} – ${formatFriendlyDate(end)}`;
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function MyLeave() {
  const profile = useCurrentStaff();
  const staffId = profile.data?.id;
  const { list, create, cancel } = useLeaveRequests(staffId ? { staff_id: staffId, per_page: 50 } : undefined);
  const items = list.data?.data?.data ?? [];
  const ownOnly = staffId ? items.filter((r) => r.staff_id === staffId) : [];

  const [showRequest, setShowRequest] = useState(false);
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [form, setForm] = useState({ leave_type: "sick" as LeaveType, start_date: "", end_date: "", reason: "" });

  if (profile.isLoading)
    return (
      <div className="space-y-3" role="status" aria-label="Loading your leave">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  if (profile.isError) return <div role="alert"><p>Unable to load your leave.</p></div>;
  if (!staffId) return <p role="status">No staff profile linked. Ask an admin to link your profile.</p>;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!staffId || !form.start_date || !form.end_date || !form.reason) return;
    if (form.end_date < form.start_date) {
      toast.error("End date must be on or after start date");
      return;
    }
    create.mutate({ staffId, data: form }, {
      onSuccess: () => {
        toast.success("Leave request submitted");
        setForm({ leave_type: "sick", start_date: "", end_date: "", reason: "" });
        setShowRequest(false);
      },
      onError: (err: Error) => toast.error(err.message || "Failed to request leave"),
    });
  }

  return (
    <section aria-label="My leave" className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-medium">My Leave</h2>
        <Button onClick={() => setShowRequest(true)}>Request Leave</Button>
      </div>

      <Dialog open={showRequest} onOpenChange={setShowRequest}>
        <DialogContent className="sm:max-w-[560px] w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle className="text-lg font-semibold">Request Leave</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1.5 leading-relaxed">Submit a leave request by selecting the leave type, date range, and providing a brief reason.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col flex-1 overflow-hidden" aria-label="Leave request form">
            <div className="overflow-y-auto overflow-x-hidden flex-1 px-6 py-5 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="leave-type" className="text-sm font-medium mb-1.5 block">Leave Type *</Label>
                <Select value={form.leave_type} onValueChange={(v) => setForm((p) => ({ ...p, leave_type: (v as LeaveType) ?? "sick" }))}>
                  <SelectTrigger id="leave-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{LEAVE_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="leave-start" className="text-sm font-medium mb-1.5 block">Start Date *</Label>
                  <Input id="leave-start" type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} required className="w-full" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leave-end" className="text-sm font-medium mb-1.5 block">End Date *</Label>
                  <Input id="leave-end" type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} required className="w-full" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="leave-reason" className="text-sm font-medium mb-1.5 block">Reason *</Label>
                <Textarea id="leave-reason" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Briefly explain the reason for your leave" required rows={3} className="min-h-[96px] resize-y w-full" />
              </div>
            </div>
            <div className="shrink-0 border-t bg-muted/30 px-6 py-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowRequest(false)} disabled={create.isPending}>Cancel</Button>
              <Button type="submit" disabled={create.isPending || !form.start_date || !form.end_date || !form.reason}>
                {create.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">History</h3>
        {list.isLoading ? (
          <div className="space-y-2 py-1" role="status" aria-label="Loading leave requests">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        )
          : list.isError ? <p role="alert">Unable to load requests.</p>
          : ownOnly.length === 0 ? <p className="text-sm text-muted-foreground">No leave requests.</p>
          : (
            <ul className="divide-y text-sm">
              {ownOnly.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 py-2">
                  <button type="button" onClick={() => setSelected(r)} className="flex flex-1 items-center justify-between gap-4 text-left hover:bg-muted/40 rounded px-2 py-1 -mx-2">
                    <span className="font-medium">{LEAVE_TYPE_LABELS[r.leave_type as LeaveType] ?? r.leave_type}</span>
                    <span className="text-muted-foreground">{formatDateRange(r.start_date, r.end_date)}</span>
                    <Badge variant="outline" className="capitalize">{formatStatus(r.status)}</Badge>
                  </button>
                  {r.status === "requested" ? (
                    <Button variant="outline" size="sm" onClick={() => cancel.mutate(r.id, { onSuccess: () => toast.success("Leave cancelled"), onError: (e: Error) => toast.error(e.message || "Cancel failed") })} disabled={cancel.isPending}>Cancel</Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-[560px] w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle className="text-lg font-semibold">Leave Details</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1.5 leading-relaxed">View your leave request details</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="overflow-y-auto overflow-x-hidden flex-1 px-6 py-5 space-y-5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground font-medium">Leave Type</span>
                <span className="font-medium">{LEAVE_TYPE_LABELS[selected.leave_type as LeaveType] ?? selected.leave_type}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground font-medium">Date Range</span>
                <span className="font-medium">{formatDateRange(selected.start_date, selected.end_date)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground font-medium">Status</span>
                <Badge variant="outline" className="capitalize">{formatStatus(selected.status)}</Badge>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground font-medium shrink-0">Reason</span>
                <span className="font-medium text-right break-words max-w-[60%]">{selected.reason}</span>
              </div>
              {selected.decision_notes ? (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground font-medium shrink-0">Decision Note</span>
                  <span className="font-medium text-right break-words max-w-[60%]">{selected.decision_notes}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground font-medium">Requested At</span>
                <span className="font-medium">{selected.requested_at ? new Date(selected.requested_at).toLocaleString("en-PH") : "—"}</span>
              </div>
              {selected.decided_at && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground font-medium">Decided At</span>
                  <span className="font-medium">{new Date(selected.decided_at).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "numeric" })}</span>
                </div>
              )}
              {selected.decider?.name && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground font-medium">Decided By</span>
                  <span className="font-medium">{selected.decider.name}</span>
                </div>
              )}
            </div>
          )}
          <div className="shrink-0 border-t bg-muted/30 px-6 py-4 flex justify-end gap-2">
            {selected?.status === "requested" && (
              <Button variant="outline" size="sm" onClick={() => selected && cancel.mutate(selected.id, { onSuccess: () => { toast.success("Leave cancelled"); setSelected(null); }, onError: (e: Error) => toast.error(e.message || "Cancel failed") })} disabled={cancel.isPending}>
                {cancel.isPending ? "Cancelling..." : "Cancel Request"}
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
