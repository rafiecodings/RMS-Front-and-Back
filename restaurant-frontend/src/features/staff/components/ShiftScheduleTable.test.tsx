import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ShiftScheduleTable } from "./ShiftScheduleTable";
import type { ShiftSchedule, Staff } from "@/lib/types";

const staff: Staff[] = [
  { id: "staff-anna", user_id: "u1", user: { id: "u1", name: "Anna", email: "a@x.ph", role: "waiter" } as never, employee_id: "EMP-01", is_active: true, hire_date: "2026-01-01", created_at: "", updated_at: "" },
  { id: "staff-ben", user_id: "u2", user: { id: "u2", name: "Ben", email: "b@x.ph", role: "cashier" } as never, employee_id: "EMP-02", is_active: true, hire_date: "2026-01-01", created_at: "", updated_at: "" },
];

const shifts: ShiftSchedule[] = [
  {
    id: "sched-1",
    staff_id: "staff-anna",
    shift_id: "shift-morning",
    date: "2026-10-05",
    status: "scheduled",
    staff: { id: "staff-anna", employee_id: "EMP-01", name: "Anna" },
    shift: { id: "shift-morning", name: "Morning Shift", start_time: "06:00:00", end_time: "14:00:00" },
    created_at: "",
    updated_at: "",
  },
];

const monday = new Date(2026, 9, 5);

describe("ShiftScheduleTable", () => {
  it("displays the scheduled shift with name and time in the right cell", () => {
    render(
      <ShiftScheduleTable
        shifts={shifts}
        staff={staff}
        isLoading={false}
        weekStart={monday}
        onWeekChange={() => {}}
        onAddShift={() => {}}
      />
    );
    expect(screen.getByText("Morning Shift")).toBeInTheDocument();
    expect(screen.getByText("06:00:00–14:00:00")).toBeInTheDocument();
  });

  it("keeps unscheduled cells as em-dash placeholders", () => {
    render(
      <ShiftScheduleTable
        shifts={shifts}
        staff={staff}
        isLoading={false}
        weekStart={monday}
        onWeekChange={() => {}}
        onAddShift={() => {}}
      />
    );
    // Anna has one scheduled day; her other six week cells stay placeholders.
    // Staff with no shifts at all (Ben) are not listed while anyone is scheduled.
    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.queryByText("Ben")).not.toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(6);
  });

  it("opens the detail view when a scheduled cell is clicked", async () => {
    const onViewSchedule = vi.fn();
    render(
      <ShiftScheduleTable
        shifts={shifts}
        staff={staff}
        isLoading={false}
        weekStart={monday}
        onWeekChange={() => {}}
        onAddShift={() => {}}
        onViewSchedule={onViewSchedule}
      />
    );
    await userEvent.click(screen.getByTitle("View shift details"));
    expect(onViewSchedule).toHaveBeenCalledWith(shifts[0], staff[0]);
  });

  it("never renders raw UUIDs in user-facing labels", () => {
    const { container } = render(
      <ShiftScheduleTable
        shifts={shifts}
        staff={staff}
        isLoading={false}
        weekStart={monday}
        onWeekChange={() => {}}
        onAddShift={() => {}}
      />
    );
    expect(container.textContent).not.toContain("staff-anna");
    expect(container.textContent).not.toContain("sched-1");
    expect(container.textContent).not.toContain("shift-morning");
  });
});
