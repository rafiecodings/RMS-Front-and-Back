import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySchedule } from "./MySchedule";
import type { ShiftSchedule, Staff } from "@/lib/types";

const state = vi.hoisted(() => ({
  profile: { data: null as Staff | null, isLoading: false, isError: false },
  schedules: { data: null as { data: { data: ShiftSchedule[] } } | null, isLoading: false, isError: false },
}));
vi.mock("@/lib/hooks/useStaff", () => ({
  useCurrentStaff: () => state.profile,
  useShiftSchedule: () => ({ list: state.schedules }),
}));

const own: Staff = { id: "own-profile", user_id: "user-1", employee_id: "EMP-77", is_active: true, hire_date: "2026-01-01", created_at: "", updated_at: "" };

const ownShift: ShiftSchedule = {
  id: "sched-own",
  staff_id: "own-profile",
  shift_id: "shift-night",
  date: "2026-10-06",
  status: "scheduled",
  staff: { id: "own-profile", employee_id: "EMP-77", name: "Mara" },
  shift: { id: "shift-night", name: "Night Shift", start_time: "22:00:00", end_time: "06:00:00" },
  created_at: "",
  updated_at: "",
};

const otherShift: ShiftSchedule = {
  id: "sched-other",
  staff_id: "someone-else",
  shift_id: "shift-day",
  date: "2026-10-07",
  status: "confirmed",
  staff: { id: "someone-else", employee_id: "EMP-99", name: "Rico" },
  shift: { id: "shift-day", name: "Day Shift", start_time: "08:00:00", end_time: "17:00:00" },
  created_at: "",
  updated_at: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(state.profile, { data: { ...own }, isLoading: false, isError: false });
  Object.assign(state.schedules, { data: { data: { data: [ownShift, otherShift] } }, isLoading: false, isError: false });
});

describe("MySchedule (operational self-service)", () => {
  it("shows only the authenticated user's own schedule", () => {
    render(<MySchedule />);
    expect(screen.getByText("Oct 6, 2026")).toBeInTheDocument();
    expect(screen.getByText(/Night Shift/)).toBeInTheDocument();
    expect(screen.queryByText("Oct 7, 2026")).not.toBeInTheDocument();
    expect(screen.queryByText(/Day Shift/)).not.toBeInTheDocument();
  });

  it("exposes no management actions", () => {
    render(<MySchedule />);
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove|delete/i })).not.toBeInTheDocument();
  });

  it("shows no raw UUIDs in user-facing labels", () => {
    const { container } = render(<MySchedule />);
    expect(container.textContent).not.toContain("own-profile");
    expect(container.textContent).not.toContain("sched-own");
    expect(container.textContent).not.toContain("someone-else");
  });

  it("explains a missing linked profile", () => {
    Object.assign(state.profile, { data: null });
    render(<MySchedule />);
    expect(screen.getByText(/No staff profile is linked/)).toBeInTheDocument();
  });
});
