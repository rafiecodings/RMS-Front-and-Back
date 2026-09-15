"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShiftScheduleTable, ShiftForm, RoleBadge } from "@/features/staff";
import { useStaff, useShiftSchedule, useStaffShifts } from "@/lib/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";
import type { ShiftSchedule, Staff, ShiftScheduleFormData, ShiftScheduleStatus } from "@/lib/types";

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
}

const EDITABLE_STATUSES: ShiftScheduleStatus[] = [
  "scheduled",
  "confirmed",
  "completed",
  "absent",
  "swap",
  "cancelled",
];

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState<Date | null>(() => getMonday(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [viewShift, setViewShift] = useState<{ shift: ShiftSchedule; staffMember?: Staff } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editForm, setEditForm] = useState({ date: "", shift_id: "", status: "scheduled" as ShiftScheduleStatus, notes: "" });

  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";

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

  const { list: shiftsList, create, update, remove } = useShiftSchedule({
    ...dateRange,
    per_page: 200,
  });
  const shifts = shiftsList.data?.data?.data ?? [];
  const { data: shiftOptions = [] } = useStaffShifts();

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

  function openDetails(shift: ShiftSchedule, staffMember?: Staff) {
    setViewShift({ shift, staffMember });
    setIsEditing(false);
    setConfirmingDelete(false);
    setEditForm({
      date: shift.date,
      shift_id: shift.shift_id,
      status: shift.status,
      notes: shift.notes ?? "",
    });
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!viewShift || !canManage) return;
    update.mutate(
      {
        id: viewShift.shift.id,
        data: {
          date: editForm.date,
          shift_id: editForm.shift_id,
          status: editForm.status,
          notes: editForm.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Schedule updated successfully");
          setIsEditing(false);
          setViewShift(null);
        },
        onError: (error: Error) => {
          toast.error(error.message || "Failed to update schedule");
        },
      }
    );
  }

  function handleDelete() {
    if (!viewShift || !canManage) return;
    remove.mutate(viewShift.shift.id, {
      onSuccess: () => {
        toast.success("Schedule removed successfully");
        setConfirmingDelete(false);
        setViewShift(null);
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to remove schedule");
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
            onViewSchedule={openDetails}
          />

          <Dialog
            open={!!viewShift}
            onOpenChange={(open) => {
              if (!open) setViewShift(null);
            }}
          >
            <DialogContent className="sm:max-w-[520px] w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
              <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                <DialogTitle>{isEditing ? "Edit Shift" : "Shift Details"}</DialogTitle>
                <DialogDescription className="sr-only">{isEditing ? "Edit schedule details" : "View schedule details"}</DialogDescription>
              </DialogHeader>
              <div className="overflow-y-auto overflow-x-hidden flex-1 px-6 py-5">
                {viewShift && !isEditing && (
                  <div className="space-y-4 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Staff</span>
                      <span className="font-medium flex items-center gap-2 text-right">
                        {viewShift.staffMember?.employee_id ? `${viewShift.staffMember.employee_id} — ${viewShift.staffMember?.user?.name ?? "Unassigned"}` : viewShift.shift.staff ? `${viewShift.shift.staff.employee_id} — ${viewShift.shift.staff.name ?? "—"}` : "—"}
                        {viewShift.staffMember?.user?.role && (
                          <RoleBadge role={viewShift.staffMember.user.role as never} />
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium">{viewShift.shift.date}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Shift</span>
                      <span className="font-medium">{viewShift.shift.shift?.name ?? "—"}</span>
                    </div>
                    {viewShift.shift.shift?.start_time && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">Time</span>
                        <span className="font-medium">
                          {viewShift.shift.shift.start_time.slice(0, 5)} – {viewShift.shift.shift.end_time.slice(0, 5)}
                        </span>
                      </div>
                    )}
                    {viewShift.shift.notes && (
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-muted-foreground shrink-0">Notes</span>
                        <span className="text-right break-words max-w-[60%]">{viewShift.shift.notes}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium capitalize">{viewShift.shift.status}</span>
                    </div>
                  </div>
                )}
                {viewShift && isEditing && canManage && (
                  <form onSubmit={handleUpdate} className="space-y-5 text-sm" aria-label="Edit shift form">
                    <div className="space-y-2">
                      <Label htmlFor="edit-date" className="text-sm font-medium">Date *</Label>
                      <Input
                        id="edit-date"
                        type="date"
                        value={editForm.date}
                        onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))}
                        required
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-shift" className="text-sm font-medium">Shift *</Label>
                      <Select value={editForm.shift_id} onValueChange={(v) => setEditForm((p) => ({ ...p, shift_id: v ?? "" }))}>
                        <SelectTrigger id="edit-shift" className="w-full">
                          <SelectValue placeholder="Select shift" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[240px]">
                          {shiftOptions.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name} ({s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-status" className="text-sm font-medium">Status</Label>
                      <Select value={editForm.status} onValueChange={(v) => setEditForm((p) => ({ ...p, status: (v as ShiftScheduleStatus) ?? "scheduled" }))}>
                        <SelectTrigger id="edit-status" className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {EDITABLE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}><span className="capitalize">{s}</span></SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-notes" className="text-sm font-medium">Notes</Label>
                      <Textarea
                        id="edit-notes"
                        value={editForm.notes}
                        onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="Optional notes"
                        rows={3}
                        className="min-h-[80px] resize-y w-full"
                      />
                    </div>
                  </form>
                )}
              </div>
              <div className="shrink-0 border-t bg-muted/30 px-6 py-4 flex justify-end gap-2">
                {viewShift && !isEditing && canManage && (
                  <>
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      Edit
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmingDelete(true)}>
                      Remove
                    </Button>
                  </>
                )}
                {viewShift && isEditing && canManage && (
                  <>
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={update.isPending}>
                      Cancel
                    </Button>
                    <Button type="button" onClick={(e) => handleUpdate(e as unknown as React.FormEvent)} disabled={update.isPending || !editForm.date || !editForm.shift_id}>
                      {update.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </>
                )}
                {viewShift && !isEditing && !canManage && (
                  <Button type="button" variant="outline" onClick={() => setViewShift(null)}>Close</Button>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
            <DialogContent className="sm:max-w-[400px] w-[calc(100vw-1.5rem)]">
              <DialogHeader>
                <DialogTitle>Remove Schedule?</DialogTitle>
                <DialogDescription>This action will soft-delete the schedule. You can restore it later if needed.</DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setConfirmingDelete(false)} disabled={remove.isPending}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={remove.isPending}>
                  {remove.isPending ? "Removing..." : "Confirm"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      <Dialog open={showForm && !!weekStart} onOpenChange={(open) => { if (!open) setShowForm(false); }}>
        <DialogContent className="sm:max-w-[520px] w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>New Shift</DialogTitle>
            <DialogDescription>Add a new shift assignment</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto overflow-x-hidden flex-1 px-6 py-5">
            {weekStart && (
              <ShiftForm
                staffList={staff}
                onSubmit={handleAddShift}
                isLoading={create.isPending}
                defaultDate={weekStart.toISOString().split("T")[0]}
                onCancel={() => setShowForm(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
