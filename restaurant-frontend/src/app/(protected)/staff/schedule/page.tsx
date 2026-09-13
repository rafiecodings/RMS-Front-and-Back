"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

          {/* Schedule details dialog with admin/manager edit + remove */}
          <Dialog
            open={!!viewShift}
            onOpenChange={(open) => {
              if (!open) setViewShift(null);
            }}
          >
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Shift Details</DialogTitle>
              </DialogHeader>
              {viewShift && !isEditing && (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Staff</span>
                    <span className="font-medium flex items-center gap-2">
                      {viewShift.staffMember?.user?.name ?? viewShift.shift.staff?.name ?? "—"}
                      {viewShift.staffMember?.user?.role && (
                        <RoleBadge role={viewShift.staffMember.user.role as never} />
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">{viewShift.shift.date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Shift</span>
                    <span className="font-medium">{viewShift.shift.shift?.name ?? "—"}</span>
                  </div>
                  {viewShift.shift.shift?.start_time && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium">
                        {viewShift.shift.shift.start_time} – {viewShift.shift.shift.end_time}
                      </span>
                    </div>
                  )}
                  {viewShift.shift.notes && (
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-muted-foreground shrink-0">Notes</span>
                      <span>{viewShift.shift.notes}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium capitalize">{viewShift.shift.status}</span>
                  </div>
                  {canManage && (
                    <div className="flex justify-end gap-2 pt-2">
                      {!confirmingDelete ? (
                        <>
                          <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                            Edit
                          </Button>
                          <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmingDelete(true)}>
                            Remove
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-muted-foreground self-center">Remove this schedule?</span>
                          <Button type="button" variant="outline" size="sm" onClick={() => setConfirmingDelete(false)}>
                            Cancel
                          </Button>
                          <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={remove.isPending}>
                            {remove.isPending ? "Removing..." : "Confirm"}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              {viewShift && isEditing && canManage && (
                <form onSubmit={handleUpdate} className="space-y-4 text-sm">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Date *</Label>
                    <Input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Shift *</Label>
                    <Select value={editForm.shift_id} onValueChange={(v) => setEditForm((p) => ({ ...p, shift_id: v ?? "" }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select shift" />
                      </SelectTrigger>
                      <SelectContent>
                        {shiftOptions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name} ({s.start_time} - {s.end_time})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Status</Label>
                    <Select value={editForm.status} onValueChange={(v) => setEditForm((p) => ({ ...p, status: (v as ShiftScheduleStatus) ?? "scheduled" }))}>
                      <SelectTrigger>
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
                    <Label className="text-sm font-medium">Notes</Label>
                    <Input
                      value={editForm.notes}
                      onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Optional notes"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={update.isPending || !editForm.date || !editForm.shift_id}>
                      {update.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}

      <Dialog open={showForm && !!weekStart} onOpenChange={(open) => { if (!open) setShowForm(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Shift</DialogTitle>
          </DialogHeader>
          {weekStart && (
            <div className="space-y-4">
              <ShiftForm
                staffList={staff}
                onSubmit={handleAddShift}
                isLoading={create.isPending}
                defaultDate={weekStart.toISOString().split("T")[0]}
              />
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
