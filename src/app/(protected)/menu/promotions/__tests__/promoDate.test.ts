import { describe, expect, it } from "vitest";
import { formatCalendarDate } from "@/lib/utils";

describe("formatCalendarDate", () => {
  it("renders the stored calendar day without timezone shift", () => {
    // Backend stores date-only schedules as UTC midnights; the displayed
    // day must match the stored date in any timezone.
    const out = formatCalendarDate("2026-09-10T00:00:00.000000Z");
    const day = new Date(2026, 8, 10).toLocaleDateString();
    expect(out).toBe(day);
  });

  it("returns a placeholder for missing or malformed input", () => {
    expect(formatCalendarDate(null)).toBe("—");
    expect(formatCalendarDate("not-a-date")).toBe("—");
  });
});
