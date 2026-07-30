"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STAFF_SHIFTS } from "@/lib/types";
import type { Staff, ShiftScheduleFormData, StaffShift } from "@/lib/types";

interface ShiftFormProps {
  staffList: Staff[];
  onSubmit: (data: ShiftScheduleFormData) => void;
  isLoading?: boolean;
  defaultDate?: string;
}

export function ShiftForm({ staffList, onSubmit, isLoading, defaultDate }: ShiftFormProps) {
  const today = defaultDate ?? new Date().toISOString().split("T")[0];

  const [form, setForm] = useState<ShiftScheduleFormData>({
    staff_id: "",
    date: today,
    shift: "morning",
    start_time: "06:00",
    end_time: "14:00",
    notes: "",
  });

  const SHIFT_TIMES: Record<StaffShift, { start: string; end: string }> = {
    morning: { start: "06:00", end: "14:00" },
    afternoon: { start: "14:00", end: "22:00" },
    evening: { start: "16:00", end: "00:00" },
    night: { start: "22:00", end: "06:00" },
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.staff_id) return;
    onSubmit(form);
  }

  function handleShiftChange(value: string | null) {
    const shift = (value ?? "morning") as StaffShift;
    const times = SHIFT_TIMES[shift] ?? SHIFT_TIMES.morning;
    setForm((prev) => ({ ...prev, shift, start_time: times.start, end_time: times.end }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Staff Member *</label>
        <Select value={form.staff_id} onValueChange={(v) => setForm((p) => ({ ...p, staff_id: v ?? "" }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select staff member" />
          </SelectTrigger>
          <SelectContent>
            {staffList.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Date *</label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Shift *</label>
          <Select value={form.shift} onValueChange={handleShiftChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAFF_SHIFTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label} ({s.time})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Start Time *</label>
          <Input
            type="time"
            value={form.start_time}
            onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">End Time *</label>
          <Input
            type="time"
            value={form.end_time}
            onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Notes</label>
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
