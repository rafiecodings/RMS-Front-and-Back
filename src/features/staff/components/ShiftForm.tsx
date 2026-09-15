"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
}

export function ShiftForm({ staffList, onSubmit, isLoading, defaultDate }: ShiftFormProps) {
  const today = defaultDate ?? new Date().toISOString().split("T")[0];
  const { data: shifts = [] } = useStaffShifts();
  // Only active staff can be scheduled (backend enforces this too).
  const schedulableStaff = staffList.filter((s) => s.is_active);

  const [form, setForm] = useState<ShiftScheduleFormData>({
    staff_id: "",
    date: today,
    shift_id: "",
    notes: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.staff_id || !form.shift_id) return;
    onSubmit(form);
  }

  function handleShiftChange(value: string | null) {
    setForm((prev) => ({ ...prev, shift_id: value ?? "" }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Staff Member *</Label>
        <Select value={form.staff_id} onValueChange={(v) => setForm((p) => ({ ...p, staff_id: v ?? "" }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select staff member" />
          </SelectTrigger>
          <SelectContent>
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Date *</Label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Shift *</Label>
          <Select value={form.shift_id} onValueChange={handleShiftChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select shift" />
            </SelectTrigger>
            <SelectContent>
              {shifts.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name} ({s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Notes</Label>
        <Input
          value={form.notes ?? ""}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value || undefined }))}
          placeholder="Optional notes"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading || !form.staff_id}>
          {isLoading ? "Saving..." : "Save Shift"}
        </Button>
      </div>
    </form>
  );
}
