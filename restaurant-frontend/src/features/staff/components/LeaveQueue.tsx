"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLeaveRequests } from "@/lib/hooks/useStaff";
import { toast } from "sonner";

export function LeaveQueue() {
  const [status, setStatus] = useState<string>("requested");
  const { list, approve, reject } = useLeaveRequests({ status: status === "all" ? undefined : status, per_page: 50 });
  const items = list.data?.data?.data ?? [];
  const [notes, setNotes] = useState<Record<string, string>>({});

  return (
    <section aria-label="Leave queue" className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-4">
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
              <li key={r.id} className="flex flex-col gap-2 py-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium">{r.staff?.employee_id}{r.staff?.name ? ` — ${r.staff.name}` : ""}</span>
                  <span className="capitalize">{r.leave_type}</span>
                  <span>{r.start_date} to {r.end_date}</span>
                  <span className="capitalize">{r.status}</span>
                </div>
                <p className="text-muted-foreground text-xs">{r.reason}</p>
                {r.status === "requested" && (
                  <div className="flex items-center gap-2">
                    <Label className="sr-only">Decision notes</Label>
                    <Input placeholder="Optional notes" value={notes[r.id] ?? ""} onChange={(e) => setNotes((p) => ({ ...p, [r.id]: e.target.value }))} className="h-8 max-w-xs" />
                    <Button size="sm" onClick={() => approve.mutate({ id: r.id, decision_notes: notes[r.id] }, { onSuccess: () => toast.success("Leave approved"), onError: (e: Error) => toast.error(e.message || "Approve failed") })} disabled={approve.isPending}>Approve</Button>
                    <Button variant="outline" size="sm" onClick={() => reject.mutate({ id: r.id, decision_notes: notes[r.id] }, { onSuccess: () => toast.success("Leave rejected"), onError: (e: Error) => toast.error(e.message || "Reject failed") })} disabled={reject.isPending}>Reject</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
