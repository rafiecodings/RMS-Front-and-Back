"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  ChevronDown,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ReportPeriod, DateRange } from "../types";

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_year", label: "This Year" },
];

interface ReportFiltersProps {
  period: ReportPeriod;
  dateRange?: DateRange;
  onPeriodChange: (period: ReportPeriod) => void;
  onDateRangeChange: (range: DateRange) => void;
}

export function ReportFilters({
  period,
  dateRange,
  onPeriodChange,
  onDateRangeChange,
}: ReportFiltersProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleReset = () => {
    onPeriodChange("this_month");
    onDateRangeChange({ from: "", to: "" });
  };

  const isCustom = period === "custom";
  const hasCustomRange = dateRange?.from && dateRange?.to;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/30 p-1">
        {PERIODS.map((p) => (
          <Button
            key={p.value}
            variant="ghost"
            size="sm"
            onClick={() => onPeriodChange(p.value)}
            className={cn(
              "h-7 px-2.5 text-xs font-medium",
              period === p.value && !isCustom
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPeriodChange("custom")}
          className={cn(
            "h-7 px-2.5 text-xs font-medium",
            isCustom
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <CalendarIcon className="mr-1 h-3 w-3" />
          Custom
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {isCustom && (
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger render={<Button variant="outline" size="sm" />}>
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
              {hasCustomRange
                ? `${format(new Date(dateRange.from), "MMM d")} - ${format(
                    new Date(dateRange.to),
                    "MMM d, yyyy"
                  )}`
                : "Select dates"}
              <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={
                  hasCustomRange
                    ? {
                        from: new Date(dateRange.from),
                        to: new Date(dateRange.to),
                      }
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

        {(isCustom || period !== "this_month") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 text-xs text-muted-foreground"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
        )}

        <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <TrendingUp className="h-3 w-3" />
          <span>Live</span>
        </div>
      </div>
    </div>
  );
}
