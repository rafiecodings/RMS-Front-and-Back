"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Check, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ReportPeriod, DateRange } from "../types";

const QUICK_RANGES: { value: ReportPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
];

interface ReportFiltersProps {
  period: ReportPeriod;
  dateRange?: DateRange;
  onPeriodChange: (period: ReportPeriod) => void;
  onDateRangeChange: (range: DateRange) => void;
}

function describeRange(
  period: ReportPeriod,
  dateRange?: DateRange
): string {
  if (period === "custom") {
    if (dateRange?.from && dateRange?.to) {
      try {
        return `${format(new Date(dateRange.from), "MMM d")} – ${format(
          new Date(dateRange.to),
          "MMM d, yyyy"
        )}`;
      } catch {
        return "Custom range";
      }
    }
    return "Custom range";
  }

  const quick = QUICK_RANGES.find((r) => r.value === period);
  if (quick) return quick.label;
  switch (period) {
    case "this_week":
      return "This Week";
    case "this_quarter":
      return "This Quarter";
    case "this_year":
      return "This Year";
    default:
      return "This Month";
  }
}

/**
 * Compact single-trigger date-range control shared by every Reports and
 * Analytics page.
 *
 * - Quick ranges apply immediately on click.
 * - Custom range applies only when [Apply] is clicked; [Cancel] preserves the
 *   currently active range.
 */
export function ReportFilters({
  period,
  dateRange,
  onPeriodChange,
  onDateRangeChange,
}: ReportFiltersProps) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(dateRange?.from ?? "");
  const [draftTo, setDraftTo] = useState(dateRange?.to ?? "");

  function handleOpenChange(next: boolean) {
    // Re-seed drafts from the active range each time the popover opens —
    // Cancel then preserves whatever was applied previously.
    if (next) {
      setDraftFrom(dateRange?.from ?? "");
      setDraftTo(dateRange?.to ?? "");
    }
    setOpen(next);
  }

  const isCustom = period === "custom";

  // Draft validation: end >= start (reversed ranges are swapped on apply).
  const draftInvalid =
    !!draftFrom &&
    !!draftTo &&
    new Date(draftTo).getTime() < new Date(draftFrom).getTime();

  const activeLabel = useMemo(
    () => describeRange(period, dateRange),
    [period, dateRange]
  );

  function applyQuick(value: ReportPeriod) {
    onPeriodChange(value);
    setOpen(false);
  }

  function applyCustom() {
    if (!draftFrom || !draftTo) return;
    let [from, to] = [draftFrom, draftTo];
    if (new Date(to).getTime() < new Date(from).getTime()) {
      [from, to] = [to, from]; // reversed pickers are handled gracefully
    }
    onPeriodChange("custom");
    onDateRangeChange({ from, to });
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={(props) => (
          <button
            type="button"
            {...props}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium shadow-sm transition-colors hover:bg-muted/50",
              open && "ring-2 ring-ring ring-offset-1"
            )}
          >
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>{activeLabel}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        )}
      />
      <PopoverContent align="start" className="w-72 p-3">
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Quick Range
        </p>
        <div className="space-y-0.5">
          {QUICK_RANGES.map((range) => (
            <button
              key={range.value}
              type="button"
              onClick={() => applyQuick(range.value)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm transition-colors",
                !isCustom && period === range.value
                  ? "bg-primary/10 font-medium text-primary"
                  : "hover:bg-muted"
              )}
            >
              {range.label}
              {!isCustom && period === range.value && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>

        <p className="mb-2 mt-3 px-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Custom
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="dr-from" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input
              id="dr-from"
              type="date"
              value={draftFrom}
              onChange={(e) => setDraftFrom(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dr-to" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="dr-to"
              type="date"
              value={draftTo}
              min={draftFrom || undefined}
              onChange={(e) => setDraftTo(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
        {draftInvalid && (
          <p className="mt-1.5 px-1 text-xs text-destructive">
            End date is before start date — dates will be swapped on Apply.
          </p>
        )}

        <div className="mt-3 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={applyCustom}
            disabled={!draftFrom || !draftTo || draftInvalid}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
