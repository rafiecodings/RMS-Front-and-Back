import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SelfAttendance } from "./SelfAttendance";
import type { Staff } from "@/lib/types";

const state = vi.hoisted(() => ({
  profile: { data: null as Staff | null, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() },
  clockIn: { mutate: vi.fn(), isPending: false },
  clockOut: { mutate: vi.fn(), isPending: false },
}));
vi.mock("@/lib/hooks/useStaff", () => ({
  useCurrentStaff: () => state.profile,
  useClockIn: () => state.clockIn,
  useClockOut: () => state.clockOut,
}));

const staff: Staff = { id: "own-profile", user_id: "user", employee_id: "EMP-01", is_active: true, hire_date: "2026-01-01", created_at: "", updated_at: "", active_attendance: null };

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(state.profile, { data: { ...staff }, isLoading: false, isError: false, isFetching: false });
  state.clockIn.isPending = false;
  state.clockOut.isPending = false;
});

describe("self-service attendance", () => {
  it("clocks in only the current profile", async () => {
    render(<SelfAttendance />);
    await userEvent.click(screen.getByRole("button", { name: "Clock In" }));
    expect(state.clockIn.mutate).toHaveBeenCalledWith({ staff_id: "own-profile" }, expect.any(Object));
    expect(state.clockOut.mutate).not.toHaveBeenCalled();
  });

  it("recognizes an overnight punch and allows inactive staff to clock out", async () => {
    state.profile.data = { ...staff, is_active: false, active_attendance: { id: "old", clock_in: "2026-01-01T20:00:00Z" } };
    render(<SelfAttendance />);
    expect(screen.getByText(/Clocked in since/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clock Out" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm Clock Out" }));
    expect(state.clockOut.mutate).toHaveBeenCalledWith({ staff_id: "own-profile" }, expect.any(Object));
  });

  it("explains missing profiles without exposing a punch action", () => {
    state.profile.data = null;
    render(<SelfAttendance />);
    expect(screen.getByText(/No staff profile is linked/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("blocks inactive clock-in", () => {
    state.profile.data = { ...staff, is_active: false };
    render(<SelfAttendance />);
    expect(screen.getByText(/Your staff profile is inactive/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("does not enable a punch before the profile loads", () => {
    state.profile.isLoading = true;
    render(<SelfAttendance />);
    expect(screen.getByRole("status")).toHaveAccessibleName("Loading your attendance");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows errors separately from missing profiles and offers retry", async () => {
    state.profile.isError = true;
    render(<SelfAttendance />);
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to load");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(state.profile.refetch).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Clock In" })).not.toBeInTheDocument();
  });

  it("disables repeated punches while saving", () => {
    state.clockIn.isPending = true;
    render(<SelfAttendance />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
