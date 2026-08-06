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
}

function formatTime(timeStr: string | undefined | null) {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h ?? "0") || 0;
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m ?? "00"} ${ampm}`;
}

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-blue-500",
  seated: "bg-purple-500",
  completed: "bg-emerald-500",
  no_show: "bg-orange-500",
  cancelled: "bg-red-500",
};

export function CalendarView({
  reservations,
  selectedDate,
  onDateSelect,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const reservationsByDate = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    for (const r of reservations) {
      const key = r.reservation_date;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    return map;
  }, [reservations]);

  function getDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

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
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          modifiers={modifiers}
          classNames={{
            day: "relative",
          }}
          components={{
            DayButton: ({ day, modifiers, ...props }) => {
              const key = getDateKey(day.date);
              const count = reservationsByDate[key]?.length ?? 0;
              const isToday =
                getDateKey(day.date) === getDateKey(new Date());

              return (
                <button
                  {...props}
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors",
                    modifiers.selected
                      ? "bg-primary text-primary-foreground"
                      : isToday
                        ? "bg-muted font-semibold"
                        : "hover:bg-muted/50",
                    modifiers.hasReservations && !modifiers.selected && "font-semibold"
                  )}
                >
                  {day.date.getDate()}
                  {count > 0 && !modifiers.selected && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {count <= 3 ? (
                        Array.from({ length: count }, (_, i) => (
                          <span
                            key={i}
                            className="h-1 w-1 rounded-full bg-primary"
                          />
                        ))
                      ) : (
                        <span className="h-1 w-1 rounded-full bg-primary" />
                      )}
                    </span>
                  )}
                </button>
              );
            },
          }}
        />
      </div>

      <Card>
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
          {selectedReservations.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedReservations.length} reservation{selectedReservations.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
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
