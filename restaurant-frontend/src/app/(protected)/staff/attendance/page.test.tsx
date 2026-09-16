import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AttendancePage from "./page";

const state = vi.hoisted(() => ({
  role: "admin" as string,
  attendanceData: { data: { data: [], meta: { last_page: 1 } } },
}));

vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u", role: state.role } }) }));
vi.mock("@/lib/hooks", async () => {
  const actual = await vi.importActual<typeof import("@/lib/hooks")>("@/lib/hooks");
  return {
    ...actual,
    useAttendance: () => ({ data: state.attendanceData, isLoading: false, isError: false }),
    useCloseAttendance: () => ({ mutate: vi.fn(), isPending: false }),
    useCurrentStaff: () => ({ data: null, isLoading: false, isError: false }),
  };
});
vi.mock("@/features/staff/components/SelfAttendance", () => ({ SelfAttendance: () => <div>SelfAttendanceMock</div> }));
vi.mock("@/features/staff", async () => {
  const actual = await vi.importActual<typeof import("@/features/staff")>("@/features/staff");
  return { ...actual, MySchedule: () => <div>MyScheduleMock</div>, AttendanceTable: () => <div>AttendanceTableMock</div> };
});

describe("Attendance management page warnings", () => {
  beforeEach(() => { state.role = "admin"; });

  it("admin without StaffProfile sees no missing-profile warning", () => {
    render(<AttendancePage />);
    expect(screen.queryByText(/No staff profile is linked/i)).not.toBeInTheDocument();
    expect(screen.getByText("AttendanceTableMock")).toBeInTheDocument();
  });

  it("manager without StaffProfile sees no warning", () => {
    state.role = "manager";
    render(<AttendancePage />);
    expect(screen.queryByText(/No staff profile is linked/i)).not.toBeInTheDocument();
  });

  it("does not render self-service components", () => {
    render(<AttendancePage />);
    expect(screen.queryByText("SelfAttendanceMock")).not.toBeInTheDocument();
    expect(screen.queryByText("MyScheduleMock")).not.toBeInTheDocument();
  });
});
