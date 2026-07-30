"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { TableLoadingRows, TableEmptyRow } from "@/components/shared";
import { RoleBadge } from "./RoleBadge";
import type { ShiftSchedule, Staff } from "@/lib/types";

interface ShiftScheduleTableProps {
  shifts: ShiftSchedule[];
  staff: Staff[];
  isLoading: boolean;
  weekStart: Date;
  onWeekChange: (date: Date) => void;
  onAddShift: () => void;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SHIFT_COLORS: Record<string, string> = {
  morning: "bg-blue-100 text-blue-800 border-blue-200",
  afternoon: "bg-amber-100 text-amber-800 border-amber-200",
  evening: "bg-purple-100 text-purple-800 border-purple-200",
  night: "bg-indigo-100 text-indigo-800 border-indigo-200",
};

function getWeekDates(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function ShiftScheduleTable({
  shifts,
  staff,
  isLoading,
  weekStart,
  onWeekChange,
  onAddShift,
}: ShiftScheduleTableProps) {
  const weekDates = getWeekDates(weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const staffWithShifts = staff.filter((s) =>
    shifts.some((sh) => sh.staff_id === s.id)
  );
  const displayStaff = staffWithShifts.length > 0 ? staffWithShifts : staff.slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() - 7);
            onWeekChange(d);
          }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {weekStart.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} –{" "}
            {weekEnd.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <Button variant="outline" size="icon-sm" onClick={() => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + 7);
            onWeekChange(d);
          }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button size="sm" onClick={onAddShift}>
          <Plus className="h-4 w-4 mr-1" />
          Add Shift
        </Button>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium w-[160px]">Staff</th>
              {DAYS.map((day, i) => {
                const d = weekDates[i];
                const isToday = formatDate(d) === formatDate(new Date());
                return (
                  <th key={day} className={`text-center px-2 py-2 font-medium ${isToday ? "bg-primary/10" : ""}`}>
                    <div className="text-xs">{day}</div>
                    <div className="text-xs text-muted-foreground">{d.getDate()}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <TableLoadingRows colSpan={8} />
            ) : displayStaff.length === 0 ? (
              <TableEmptyRow message="No staff with scheduled shifts" colSpan={8} />
            ) : (
              displayStaff.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2">
                    <p className="font-medium text-xs">{s.first_name} {s.last_name}</p>
                    <RoleBadge role={s.role} />
                  </td>
                  {weekDates.map((d, i) => {
                    const dateStr = formatDate(d);
                    const dayShift = shifts.find(
                      (sh) => sh.staff_id === s.id && sh.date === dateStr
                    );
                    const isToday = dateStr === formatDate(new Date());
                    return (
                      <td key={i} className={`px-1 py-1 text-center ${isToday ? "bg-primary/5" : ""}`}>
                        {dayShift ? (
                          <div className={`rounded border px-1.5 py-1 text-xs ${SHIFT_COLORS[dayShift.shift] ?? ""}`}>
                            <p className="font-medium capitalize">{dayShift.shift}</p>
                            <p className="text-[10px] opacity-70">{dayShift.start_time}–{dayShift.end_time}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
