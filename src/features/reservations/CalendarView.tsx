"use client";

import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import type { Reservation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
  reservations: Reservation[];
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  /** Reports the visible month upward so the page can fetch its data. */
  onMonthChange?: (month: Date) => void;
  isLoading?: boolean;
}

function formatTime(timeStr: string | undefined | null) {
  if (!timeStr) return "—";
  const parts = (timeStr || "").split(":");
  if (parts.length < 2) return "—";
  const hour = parseInt(parts[0] || "0", 10);
  if (isNaN(hour)) return "—";
  const minute = parts[1] || "00";
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${minute} ${ampm}`;
}

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-blue-500",
  seated: "bg-purple-500",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
};

function getDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function CalendarView({
  reservations,
  selectedDate,
  onDateSelect,
  onMonthChange,
  isLoading = false,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  function handleMonthChange(month: Date) {
    setCurrentMonth(month);
    onMonthChange?.(month);
  }

  const todayKey = useMemo(() => {
    return getDateKey(new Date());
  }, []);

  const reservationsByDate = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    for (const r of reservations) {
      const key = r.reservation_date;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    return map;
  }, [reservations]);

  const selectedDateKey = selectedDate ? getDateKey(selectedDate) : "";
  const selectedReservations = selectedDateKey
    ? reservationsByDate[selectedDateKey] ?? []
    : [];

  const modifiers = {
    hasReservations: (date: Date) => {
      const key = getDateKey(date);
      return (reservationsByDate[key]?.length ?? 0) > 0;
    },
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.65fr_0.95fr] items-start">
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Reservation Calendar</CardTitle>
          <p className="text-xs text-muted-foreground">Select a date to view its reservations</p>
        </CardHeader>
        <CardContent className="pt-0">
          <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          month={currentMonth}
          onMonthChange={handleMonthChange}
          modifiers={modifiers}
          className="w-full"
          classNames={{
            root: "w-full",
            months: "w-full",
            month: "w-full",
            month_caption: "w-full",
            month_grid: "w-full border-collapse",
            weekdays: "flex w-full",
            weekday: "flex-1 text-center",
            week: "flex w-full mt-2 gap-1",
            day: "flex-1 relative p-0.5 h-auto",
          }}
          components={{
            DayButton: ({ day, modifiers, ...props }) => {
              const key = getDateKey(day.date);
              const count = reservationsByDate[key]?.length ?? 0;
              const isToday =
                todayKey !== null && getDateKey(day.date) === todayKey;

              return (
                <button
                  {...props}
                  className={cn(
                    "relative flex h-10 w-full sm:h-12 lg:h-[72px] items-center justify-center rounded-xl text-sm transition-colors border border-transparent",
                    modifiers.selected
                      ? "bg-primary text-primary-foreground"
                      : isToday
                        ? "bg-primary/10 ring-1 ring-primary/30 font-semibold"
                        : "hover:bg-muted/50",
                    modifiers.hasReservations && !modifiers.selected && "font-semibold"
                  )}
                >
                  {day.date.getDate()}
                  {count > 0 && (
                    <span className={cn("absolute bottom-1 right-1 rounded-full min-w-4 px-1 py-0 text-[10px] font-bold leading-none text-center", modifiers.selected ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground")}>{count}</span>
                  )}
                </button>
              );
            },
          }}
        />
        </CardContent>
      </Card>

      <Card className="lg:h-full lg:flex lg:flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">
            {selectedDate
              ? selectedDate.toLocaleDateString("en-PH", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })
              : "Select a date"}
          </CardTitle>
          {isLoading ? (
            <span className="text-xs text-muted-foreground">Loading…</span>
          ) : (
            selectedReservations.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedReservations.length} reservation{selectedReservations.length !== 1 ? "s" : ""}
              </Badge>
            )
          )}
        </CardHeader>
        <CardContent className="flex-1">
          {selectedReservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">
                {selectedDate ? "No reservations on this date" : "Click a date to view reservations"}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {selectedReservations
                .sort((a, b) => a.reservation_time.localeCompare(b.reservation_time))
                .map((res) => (
                  <div
                    key={res.id}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col items-center shrink-0 text-center min-w-[50px]">
                      <span className="text-sm font-bold">{formatTime(res.reservation_time)}</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Users className="h-3 w-3" />
                        {res.party_size}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{res.customer?.name ?? res.guest_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {res.table ? `Table ${res.table.number}` : "No table assigned"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        STATUS_DOT[res.status] ?? "bg-gray-400"
                      )}
                    />
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
