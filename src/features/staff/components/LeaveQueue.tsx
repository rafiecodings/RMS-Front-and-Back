"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLeaveRequests } from "@/lib/hooks/useStaff";
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

export function LeaveQueue() {
  const [status, setStatus] = useState<string>("requested");
  const { list, approve, reject } = useLeaveRequests({ status: status === "all" ? undefined : status, per_page: 50 });
  const items = list.data?.data?.data ?? [];
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);

  function openDetails(r: LeaveRequest) {
    setSelected(r);
    setDecisionNote("");
    setConfirmApprove(false);
    setConfirmReject(false);
  }

  function handleApprove() {
    if (!selected) return;
    approve.mutate({ id: selected.id, decision_notes: decisionNote || undefined }, {
      onSuccess: () => {
        toast.success("Leave approved");
        setConfirmApprove(false);
        setSelected(null);
      },
      onError: (e: Error) => toast.error(e.message || "Approve failed"),
    });
  }

  function handleReject() {
    if (!selected) return;
    reject.mutate({ id: selected.id, decision_notes: decisionNote || undefined }, {
      onSuccess: () => {
        toast.success("Leave rejected");
        setConfirmReject(false);
        setSelected(null);
      },
      onError: (e: Error) => toast.error(e.message || "Reject failed"),
    });
  }

  const isRequested = selected?.status === "requested";

  return (
    <section aria-label="Leave queue" className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-medium">Leave Requests</h2>
        <Select value={status} onValueChange={(v) => setStatus(v ?? "requested")}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="requested">Requested</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {list.isLoading ? <p role="status">Loading...</p>
        : list.isError ? <p role="alert">Unable to load.</p>
        : items.length === 0 ? <p className="text-sm text-muted-foreground">No requests.</p>
        : (
          <ul className="divide-y text-sm">
            {items.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 flex-1 min-w-0">
                  <span className="font-medium truncate">{r.staff?.employee_id}{r.staff?.name ? ` — ${r.staff.name}` : ""}</span>
                  <span className="font-medium">{LEAVE_TYPE_LABELS[r.leave_type as LeaveType] ?? r.leave_type}</span>
                  <span className="text-muted-foreground">{formatDateRange(r.start_date, r.end_date)}</span>
                  <Badge variant="outline" className="capitalize">{formatStatus(r.status)}</Badge>
                </div>
                <Button variant="outline" size="sm" onClick={() => openDetails(r)}>View</Button>
              </li>
            ))}
          </ul>
        )}

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-[520px] w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle className="text-lg font-semibold">Leave Request Details</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1.5">Review and take action on this request</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="overflow-y-auto overflow-x-hidden flex-1 px-6 py-5 space-y-5 text-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Employee</span>
                  <span className="font-medium text-right">{selected.staff?.employee_id}{selected.staff?.name ? ` — ${selected.staff.name}` : ""}</span>
                </div>
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
                  <span className="text-muted-foreground shrink-0">Reason</span>
                  <span className="font-medium text-right break-words max-w-[60%]">{selected.reason}</span>
                </div>
                {selected.decision_notes ? (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">Decision Note</span>
                    <span className="font-medium text-right break-words max-w-[60%]">{selected.decision_notes}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Requested At</span>
                  <span className="font-medium">{selected.requested_at ? new Date(selected.requested_at).toLocaleString("en-PH") : "—"}</span>
                </div>
                {selected.decided_at && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Decided At</span>
                    <span className="font-medium">{new Date(selected.decided_at).toLocaleString("en-PH")}</span>
                  </div>
                )}
                {selected.decider?.name && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Decided By</span>
                    <span className="font-medium">{selected.decider.name}</span>
                  </div>
                )}
              </div>

              {isRequested && !confirmApprove && !confirmReject && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="decision-note" className="text-sm font-medium">Decision Note (optional)</Label>
                    <Textarea id="decision-note" value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} placeholder="Optional note for approval/rejection" rows={3} className="min-h-[80px] resize-y w-full" />
                  </div>
                </div>
              )}

              {confirmApprove && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
                  <p className="font-medium">Confirm approval?</p>
                  <p className="text-muted-foreground text-xs mt-1">This will mark the request as approved and update related schedules.</p>
                </div>
              )}
              {confirmReject && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-3 text-sm">
                  <p className="font-medium">Confirm rejection?</p>
                  <p className="text-muted-foreground text-xs mt-1">This will mark the request as rejected.</p>
                </div>
              )}
            </div>
          )}
          <div className="shrink-0 border-t bg-muted/30 px-6 py-4 flex justify-end gap-2 flex-wrap">
            {!isRequested ? (
              <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            ) : confirmApprove ? (
              <>
                <Button variant="outline" onClick={() => setConfirmApprove(false)} disabled={approve.isPending}>Cancel</Button>
                <Button onClick={handleApprove} disabled={approve.isPending}>{approve.isPending ? "Approving..." : "Confirm Approve"}</Button>
              </>
            ) : confirmReject ? (
              <>
                <Button variant="outline" onClick={() => setConfirmReject(false)} disabled={reject.isPending}>Cancel</Button>
                <Button variant="destructive" onClick={handleReject} disabled={reject.isPending}>{reject.isPending ? "Rejecting..." : "Confirm Reject"}</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
                <Button onClick={() => setConfirmApprove(true)} disabled={approve.isPending || reject.isPending}>Approve</Button>
                <Button variant="destructive" onClick={() => setConfirmReject(true)} disabled={approve.isPending || reject.isPending}>Reject</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
