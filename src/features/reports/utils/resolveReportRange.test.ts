import { describe, expect, it } from "vitest";
import { resolveReportRange } from "./resolveReportRange";

describe("resolveReportRange", () => {
  const now = new Date(2026, 7, 21); // Aug 21 2026 (Friday)

  it("today yields a single-day range", () => {
    expect(resolveReportRange("today", undefined, now)).toEqual({
      start_date: "2026-08-21",
      end_date: "2026-08-21",
    });
  });

  it("yesterday yields a single-day range", () => {
    expect(resolveReportRange("yesterday", undefined, now)).toEqual({
      start_date: "2026-08-20",
      end_date: "2026-08-20",
    });
  });

  it("last_7_days covers the trailing week inclusive", () => {
    expect(resolveReportRange("last_7_days", undefined, now)).toEqual({
      start_date: "2026-08-15",
      end_date: "2026-08-21",
    });
  });

  it("last_30_days covers 30 days inclusive", () => {
    expect(resolveReportRange("last_30_days", undefined, now)).toEqual({
      start_date: "2026-07-23",
      end_date: "2026-08-21",
    });
  });

  it("this_month is month-to-date", () => {
    expect(resolveReportRange("this_month", undefined, now)).toEqual({
      start_date: "2026-08-01",
      end_date: "2026-08-21",
    });
  });

  it("last_month handles year boundaries", () => {
    const jan = new Date(2026, 0, 15);
    expect(resolveReportRange("last_month", undefined, jan)).toEqual({
      start_date: "2025-12-01",
      end_date: "2025-12-31",
    });
  });

  it("custom uses provided range", () => {
    expect(
      resolveReportRange(
        "custom",
        { from: "2026-08-10", to: "2026-08-12" },
        now
      )
    ).toEqual({ start_date: "2026-08-10", end_date: "2026-08-12" });
  });

  it("this_week starts on Monday", () => {
    const wed = new Date(2026, 7, 19); // Wednesday
    expect(resolveReportRange("this_week", undefined, wed)).toEqual({
      start_date: "2026-08-17",
      end_date: "2026-08-19",
    });
  });
});
