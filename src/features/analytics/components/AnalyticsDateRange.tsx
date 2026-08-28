"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import type { AnalyticsPeriod, DateRange } from "../types";

const PRESETS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_year", label: "This Year" },
];

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  this_month: "This Month",
  last_month: "Last Month",
  this_quarter: "This Quarter",
  this_year: "This Year",
  custom: "Custom",
};

function formatRangeLabel(start: string, end: string): string {
  const from = new Date(start);
  const to = new Date(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "";
  const sameYear = from.getFullYear() === to.getFullYear();
  return sameYear
    ? `${format(from, "MMM d")} – ${format(to, "MMM d, yyyy")}`
    : `${format(from, "MMM d, yyyy")} – ${format(to, "MMM d, yyyy")}`;
}

interface AnalyticsDateRangeProps {
  period: AnalyticsPeriod;
  dateRange?: DateRange;
  /** Resolved start/end dates (via resolveReportRange) shown on the trigger. */
  resolvedRange: { start_date: string; end_date: string };
  onPeriodChange: (period: AnalyticsPeriod) => void;
  onDateRangeChange: (range: DateRange) => void;
}

/**
 * Compact date-range control for the Analytics hub: a single trigger showing
 * the active preset and its actual resolved dates, opening a popover with
 * quick presets and a Custom Range form. All date math stays in the caller
 * (resolveReportRange) — this component never computes ranges itself.
 */
export function AnalyticsDateRange({
  period,
  dateRange,
  resolvedRange,
  onPeriodChange,
  onDateRangeChange,
}: AnalyticsDateRangeProps) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");

  function seedDraft() {
    setDraftFrom(period === "custom" ? (dateRange?.from ?? "") : "");
    setDraftTo(period === "custom" ? (dateRange?.to ?? "") : "");
  }

  function selectPreset(value: AnalyticsPeriod) {
    onPeriodChange(value);
    setOpen(false);
  }

  const draftValid =
    draftFrom !== "" &&
    draftTo !== "" &&
    new Date(draftFrom).getTime() <= new Date(draftTo).getTime();

  function applyCustom() {
    if (!draftValid) return;
    onDateRangeChange({ from: draftFrom, to: draftTo });
    onPeriodChange("custom");
    setOpen(false);
  }

  const rangeLabel = formatRangeLabel(resolvedRange.start_date, resolvedRange.end_date);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) seedDraft();
        setOpen(next);
      }}
    >
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="max-w-full font-normal" aria-label={`Date range: ${PERIOD_LABELS[period]} ${rangeLabel}`} />
        }
      >
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="shrink-0 text-[0.8rem]">{PERIOD_LABELS[period]}</span>
          <span className="hidden truncate text-xs text-muted-foreground sm:inline">
            · {rangeLabel}
          </span>
        </span>
        <ChevronDown className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Quick Presets
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((preset) => (
            <Button
              key={preset.value}
              size="xs"
              variant={period === preset.value ? "secondary" : "ghost"}
              className={period === preset.value ? "font-semibold" : "text-muted-foreground"}
              onClick={() => selectPreset(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <Separator className="my-1" />

        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Custom Range
        </p>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label htmlFor="analytics-date-from" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input
              id="analytics-date-from"
              type="date"
              value={draftFrom}
              onChange={(e) => setDraftFrom(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="analytics-date-to" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="analytics-date-to"
              type="date"
              value={draftTo}
              min={draftFrom || undefined}
              onChange={(e) => setDraftTo(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          {draftFrom !== "" && draftTo !== "" && !draftValid && (
            <p className="text-xs text-destructive">End date cannot be before start date.</p>
          )}
          <div className="flex items-center justify-end gap-1.5 pt-0.5">
            <Button size="xs" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="xs" disabled={!draftValid} onClick={applyCustom}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
