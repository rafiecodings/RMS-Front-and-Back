"use client";

import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CalendarDays, CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import type { Reservation } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
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

  function handleToday() {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    onMonthChange?.(new Date(today.getFullYear(), today.getMonth(), 1));
    onDateSelect?.(today);
  }

  function goPrev() {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() - 1);
    handleMonthChange(d);
  }

  function goNext() {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + 1);
    handleMonthChange(d);
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Reservation Calendar</CardTitle>
          <p className="text-xs text-muted-foreground">Select a date to view its reservations</p>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b pb-3">
            <h3 className="text-lg font-semibold tracking-tight">
              {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h3>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-8 rounded-lg border px-3 text-xs font-medium" onClick={handleToday}>
                Today
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border" onClick={goPrev} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border" onClick={goNext} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
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
            month_caption: "hidden",
            nav: "hidden",
            month_grid: "w-full border-collapse",
            weekdays: "flex w-full border-b pb-2 mb-1",
            weekday: "flex-1 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide",
            week: "flex w-full gap-1",
            day: "flex-1 relative p-0.5 h-auto",
          }}
          components={{
            DayButton: ({ day, modifiers, ...props }) => {
              const key = getDateKey(day.date);
              const count = reservationsByDate[key]?.length ?? 0;
              const isToday = getDateKey(day.date) === todayKey;
              const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
              const isOutside = modifiers.outside;
              const isSelected = modifiers.selected;

              return (
                <button
                  {...props}
                  className={cn(
                    "relative flex flex-col items-start justify-start w-full h-[46px] sm:h-[48px] lg:min-h-[84px] lg:h-[84px] rounded-lg border p-2 text-sm transition-colors",
                    isOutside
                      ? "text-muted-foreground/40 bg-muted/10 border-transparent"
                      : "border-transparent",
                    !isOutside && !isSelected && isWeekend && "bg-muted/10",
                    !isSelected && !isOutside && "hover:bg-muted/40 hover:border-border",
                    isSelected && "bg-primary/10 border-primary/30 ring-1 ring-primary/20",
                    isOutside && isSelected && "bg-primary/10 border-primary/30"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium leading-none",
                      isToday && !isSelected && "bg-primary text-primary-foreground",
                      isToday && isSelected && "bg-primary text-primary-foreground",
                      isSelected && !isToday && "font-semibold"
                    )}
                  >
                    {day.date.getDate()}
                  </span>
                  {count > 0 && (
                    <span className={cn("mt-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none", isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-primary/10 text-primary border-primary/20")}>
                      <CalendarClock className="h-3 w-3 hidden sm:inline" />
                      <span className="hidden sm:inline">{count} {count === 1 ? "reservation" : "reservations"}</span>
                      <span className="sm:hidden">{count}</span>
                    </span>
                  )}
                </button>
              );
            },
          }}
        />
          <div className="flex items-center gap-4 pt-2 text-[11px] text-muted-foreground border-t">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Has reservations</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">3</span> Today</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-6 w-6 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-[10px]">3</span> Selected</span>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:h-full lg:flex lg:flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
          <CardTitle className="text-base font-semibold">
            {selectedDate
              ? selectedDate.toLocaleDateString("en-PH", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : "Select a date"}
          </CardTitle>
          {isLoading ? (
            <Skeleton className="h-5 w-24 rounded-full" />
          ) : (
            selectedReservations.length > 0 && (
              <Badge variant="secondary" className="text-xs rounded-full">
                {selectedReservations.length} {selectedReservations.length === 1 ? "Reservation" : "Reservations"}
              </Badge>
            )
          )}
        </CardHeader>
        <CardContent className="flex-1 pt-4">
          {selectedReservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted border mb-4">
                <CalendarDays className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Select a date</p>
              <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
                {selectedDate ? "No reservations on this date" : "Choose a date from the calendar to view reservations."}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {selectedReservations
                .sort((a, b) => a.reservation_time.localeCompare(b.reservation_time))
                .map((res) => (
                  <div
                    key={res.id}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex flex-col items-center shrink-0 text-center min-w-[56px]">
                      <span className="text-sm font-bold">{formatTime(res.reservation_time)}</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Users className="h-3 w-3" />
                        {res.party_size} guests
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{res.customer?.name ?? res.guest_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {res.table ? `Table ${res.table.number}` : "No table assigned"}
                      </p>
                    </div>
                    <Badge variant={res.status === "cancelled" ? "destructive" : res.status === "confirmed" ? "default" : "secondary"} className="shrink-0 rounded-full text-[11px] capitalize">
                      {res.status}
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
