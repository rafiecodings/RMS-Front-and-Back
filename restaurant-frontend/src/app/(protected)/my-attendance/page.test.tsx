import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyAttendancePage from "./page";

const state = vi.hoisted(() => ({
  profile: null as unknown,
  isLoading: false,
  isError: false,
}));

vi.mock("@/lib/hooks/useStaff", () => ({
  useCurrentStaff: () => ({ data: state.profile, isLoading: state.isLoading, isError: state.isError, refetch: vi.fn(), isFetching: false }),
  useLeaveRequests: () => ({ list: { data: { data: { data: [] } }, isLoading: false, isError: false }, create: { mutate: vi.fn(), isPending: false }, cancel: { mutate: vi.fn(), isPending: false } }),
  useShiftSchedule: () => ({ list: { data: { data: { data: [] } }, isLoading: false, isError: false } }),
  useAttendance: () => ({ data: { data: { data: [] } }, isLoading: false, isError: false }),
  useClockIn: () => ({ mutate: vi.fn(), isPending: false }),
  useClockOut: () => ({ mutate: vi.fn(), isPending: false }),
  useStaffShifts: () => ({ data: [] }),
}));

vi.mock("@/features/staff/components/SelfAttendance", () => ({ SelfAttendance: () => <div>SelfContent</div> }));
vi.mock("@/features/staff", async () => {
  const actual = await vi.importActual<typeof import("@/features/staff")>("@/features/staff");
  return { ...actual, MySchedule: () => <div>MyScheduleContent</div> };
});
vi.mock("@/features/staff/components/MyLeave", () => ({ MyLeave: () => <div>MyLeaveContent</div> }));

describe("My Attendance self-service warnings", () => {
  beforeEach(() => {
    state.profile = null;
    state.isLoading = false;
    state.isError = false;
  });

  it("operational without profile sees warning once", () => {
    render(<MyAttendancePage />);
    const warnings = screen.getAllByText(/No staff profile is linked/i);
    expect(warnings).toHaveLength(1);
  });

  it("does not duplicate warning text", () => {
    render(<MyAttendancePage />);
    const matches = screen.getAllByText(/No staff profile is linked/i);
    expect(matches.length).toBe(1);
    expect(screen.queryByText("SelfContent")).not.toBeInTheDocument();
    expect(screen.queryByText("MyScheduleContent")).not.toBeInTheDocument();
  });

  it("hides clock content when no profile", () => {
    render(<MyAttendancePage />);
    expect(screen.queryByText("SelfContent")).not.toBeInTheDocument();
  });

  it("shows self content when profile exists", () => {
    state.profile = { id: "s1", employee_id: "EMP-1" } as unknown;
    render(<MyAttendancePage />);
    expect(screen.queryByText(/No staff profile is linked/i)).not.toBeInTheDocument();
    expect(screen.getByText("SelfContent")).toBeInTheDocument();
  });
});
