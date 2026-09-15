"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentStaff, useLeaveRequests } from "@/lib/hooks/useStaff";
import { toast } from "sonner";
import type { LeaveType } from "@/lib/types";

const LEAVE_TYPES: LeaveType[] = ["sick", "vacation", "emergency", "unpaid", "other"];

export function MyLeave() {
  const profile = useCurrentStaff();
  const staffId = profile.data?.id;
  const { list, create, cancel } = useLeaveRequests(staffId ? { staff_id: staffId, per_page: 50 } : undefined);
  const items = list.data?.data?.data ?? [];
  const ownOnly = staffId ? items.filter((r) => r.staff_id === staffId) : [];

  const [form, setForm] = useState({ leave_type: "sick" as LeaveType, start_date: "", end_date: "", reason: "" });

  if (profile.isLoading) return <p role="status">Loading your leave...</p>;
  if (profile.isError) return <div role="alert"><p>Unable to load your leave.</p></div>;
  if (!staffId) return <p role="status">No staff profile linked. Ask an admin to link your profile.</p>;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!staffId || !form.start_date || !form.end_date || !form.reason) return;
    create.mutate({ staffId, data: form }, {
      onSuccess: () => { toast.success("Leave request submitted"); setForm((p) => ({ ...p, reason: "", start_date: "", end_date: "" })); },
      onError: (err: Error) => toast.error(err.message || "Failed to request leave"),
    });
  }

  return (
    <section aria-label="My leave" className="rounded-lg border bg-card p-4 space-y-4">
      <h2 className="font-medium">My Leave</h2>
      <form onSubmit={submit} className="space-y-3" aria-label="Leave request form">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Leave Type *</Label>
            <Select value={form.leave_type} onValueChange={(v) => setForm((p) => ({ ...p, leave_type: (v as LeaveType) ?? "sick" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEAVE_TYPES.map((t) => <SelectItem key={t} value={t}><span className="capitalize">{t}</span></SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Start Date *</Label>
            <Input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label>End Date *</Label>
            <Input type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Reason *</Label>
          <Input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Reason for leave" required />
        </div>
        <Button type="submit" disabled={create.isPending || !form.reason}> {create.isPending ? "Submitting..." : "Request Leave"} </Button>
      </form>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">History</h3>
        {list.isLoading ? <p role="status">Loading requests...</p>
          : list.isError ? <p role="alert">Unable to load requests.</p>
          : ownOnly.length === 0 ? <p className="text-sm text-muted-foreground">No leave requests.</p>
          : (
            <ul className="divide-y text-sm">
              {ownOnly.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 py-2">
                  <span className="capitalize">{r.leave_type}</span>
                  <span>{r.start_date} to {r.end_date}</span>
                  <span className="capitalize">{r.status}</span>
                  {r.status === "requested" ? (
                    <Button variant="outline" size="sm" onClick={() => cancel.mutate(r.id, { onSuccess: () => toast.success("Leave cancelled"), onError: (e: Error) => toast.error(e.message || "Cancel failed") })} disabled={cancel.isPending}>Cancel</Button>
                  ) : <span className="text-xs text-muted-foreground">{r.decision_notes ?? ""}</span>}
                </li>
              ))}
            </ul>
          )}
      </div>
    </section>
  );
}
