"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import type { AnalyticsPeriod, DateRange } from "../types";

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

interface AnalyticsFilterProps {
  period: AnalyticsPeriod;
  dateRange?: DateRange;
  onPeriodChange: (period: AnalyticsPeriod) => void;
  onDateRangeChange: (range: DateRange) => void;
}

export function AnalyticsFilter({
  period,
  dateRange,
  onPeriodChange,
  onDateRangeChange,
}: AnalyticsFilterProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-sm font-medium">Period</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 [&_button]:min-h-10">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? "default" : "outline"}
              size="sm"
              onClick={() => onPeriodChange(p.value)}
            >
              {p.label}
            </Button>
          ))}
          {period === "custom" && (
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger render={<Button variant="outline" size="sm" />}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from && dateRange?.to
                  ? `${format(new Date(dateRange.from), "MMM d")} - ${format(new Date(dateRange.to), "MMM d, yyyy")}`
                  : "Select dates"}
                <ChevronDown className="ml-2 h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={
                    dateRange?.from && dateRange?.to
                      ? { from: new Date(dateRange.from), to: new Date(dateRange.to) }
                      : undefined
                  }
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      onDateRangeChange({
                        from: format(range.from, "yyyy-MM-dd"),
                        to: format(range.to, "yyyy-MM-dd"),
                      });
                      setCalendarOpen(false);
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
