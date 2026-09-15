"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStaffShifts } from "@/lib/hooks";
import type { Staff, ShiftScheduleFormData } from "@/lib/types";

interface ShiftFormProps {
  staffList: Staff[];
  onSubmit: (data: ShiftScheduleFormData) => void;
  isLoading?: boolean;
  defaultDate?: string;
  onCancel?: () => void;
}

export function ShiftForm({ staffList, onSubmit, isLoading, defaultDate, onCancel }: ShiftFormProps) {
  const today = defaultDate ?? new Date().toISOString().split("T")[0];
  const { data: shifts = [] } = useStaffShifts();
  const schedulableStaff = staffList.filter((s) => s.is_active);

  const [form, setForm] = useState<ShiftScheduleFormData>({
    staff_id: "",
    date: today,
    shift_id: "",
    notes: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.staff_id || !form.shift_id || !form.date) return;
    onSubmit(form);
  }

  function handleShiftChange(value: string | null) {
    setForm((prev) => ({ ...prev, shift_id: value ?? "" }));
  }

  const canSubmit = !!form.staff_id && !!form.shift_id && !!form.date && !isLoading;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="shift-form-staff" className="text-sm font-medium">Staff Member *</Label>
        <Select value={form.staff_id} onValueChange={(v) => setForm((p) => ({ ...p, staff_id: v ?? "" }))}>
          <SelectTrigger id="shift-form-staff" className="w-full">
            <SelectValue placeholder="Select staff member" />
          </SelectTrigger>
          <SelectContent className="max-h-[260px]">
            {schedulableStaff.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No active staff available</div>
            ) : (
              schedulableStaff.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.employee_id} — {s.user?.name ?? "Unassigned"}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="shift-form-date" className="text-sm font-medium">Date *</Label>
        <Input
          id="shift-form-date"
          type="date"
          value={form.date}
          onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
          required
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="shift-form-shift" className="text-sm font-medium">Shift *</Label>
        <Select value={form.shift_id} onValueChange={handleShiftChange}>
          <SelectTrigger id="shift-form-shift" className="w-full">
            <SelectValue placeholder="Select shift" />
          </SelectTrigger>
          <SelectContent className="max-h-[260px]">
            {shifts.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name} ({s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="shift-form-notes" className="text-sm font-medium">Notes</Label>
        <Textarea
          id="shift-form-notes"
          value={form.notes ?? ""}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value || undefined }))}
          placeholder="Optional notes"
          rows={3}
          className="min-h-[80px] resize-y w-full"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background -mx-6 -mb-6 px-6 py-4 sm:-mx-6">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={!canSubmit}>
          {isLoading ? "Saving..." : "Save Shift"}
        </Button>
      </div>
    </form>
  );
}
