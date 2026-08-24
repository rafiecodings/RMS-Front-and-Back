import type { ReportPeriod } from "@/features/reports/types";

/**
 * Convert a report period preset (or custom range) into explicit
 * start_date/end_date strings — the single contract the backend
 * understands. Presets are never sent as opaque `period` values.
 */
export function resolveReportRange(
  period: ReportPeriod,
  dateRange?: { from?: string; to?: string },
  now: Date = new Date()
): { start_date: string; end_date: string } {
  const d = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  if (period === "custom") {
    return {
      start_date: dateRange?.from || d(new Date(now.getFullYear(), now.getMonth(), 1)),
      end_date: dateRange?.to || d(now),
    };
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "today":
      return { start_date: d(startOfToday), end_date: d(startOfToday) };
    case "yesterday": {
      const y = new Date(startOfToday);
      y.setDate(y.getDate() - 1);
      return { start_date: d(y), end_date: d(y) };
    }
    case "this_week": {
      // Monday-start week.
      const monday = new Date(startOfToday);
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      return { start_date: d(monday), end_date: d(now) };
    }
    case "last_week": {
      const monday = new Date(startOfToday);
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      const lastMonday = new Date(monday);
      lastMonday.setDate(lastMonday.getDate() - 7);
      const lastSunday = new Date(monday);
      lastSunday.setDate(lastSunday.getDate() - 1);
      return { start_date: d(lastMonday), end_date: d(lastSunday) };
    }
    case "last_7_days": {
      const s = new Date(startOfToday);
      s.setDate(s.getDate() - 6);
      return { start_date: d(s), end_date: d(now) };
    }
    case "last_30_days": {
      const s = new Date(startOfToday);
      s.setDate(s.getDate() - 29);
      return { start_date: d(s), end_date: d(now) };
    }
    case "this_month":
      return {
        start_date: d(new Date(now.getFullYear(), now.getMonth(), 1)),
        end_date: d(now),
      };
    case "last_month":
      return {
        start_date: d(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        end_date: d(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    case "this_quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return {
        start_date: d(new Date(now.getFullYear(), q * 3, 1)),
        end_date: d(now),
      };
    }
    case "this_year":
      return {
        start_date: d(new Date(now.getFullYear(), 0, 1)),
        end_date: d(now),
      };
    default:
      return {
        start_date: d(new Date(now.getFullYear(), now.getMonth(), 1)),
        end_date: d(now),
      };
  }
}
