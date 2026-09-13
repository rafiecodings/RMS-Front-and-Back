import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SchedulePage from "./page";
import type { ShiftSchedule, Staff } from "@/lib/types";

const state = vi.hoisted(() => ({
  role: "admin",
  staffList: [] as Staff[],
  shifts: [] as ShiftSchedule[],
  shiftOptions: [{ id: "shift-morning", name: "Morning Shift", start_time: "06:00:00", end_time: "14:00:00" }],
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  removeMutate: vi.fn(),
}));
vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u", role: state.role } }) }));
vi.mock("@/lib/hooks", () => ({
  useStaff: () => ({ list: { data: { data: { data: state.staffList } }, isLoading: false } }),
  useShiftSchedule: () => ({
    list: { data: { data: { data: state.shifts } }, isLoading: false },
    create: { mutate: state.createMutate, isPending: false },
    update: { mutate: state.updateMutate, isPending: false },
    remove: { mutate: state.removeMutate, isPending: false },
  }),
  useStaffShifts: () => ({ data: state.shiftOptions }),
}));

const anna: Staff = { id: "staff-anna", user_id: "u1", user: { id: "u1", name: "Anna", email: "a@x.ph", role: "waiter" } as never, employee_id: "EMP-01", is_active: true, hire_date: "2026-01-01", created_at: "", updated_at: "" };

function mondayOfCurrentWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  state.role = "admin";
  const monday = mondayOfCurrentWeek();
  state.staffList = [anna];
  state.shifts = [
    {
      id: "sched-1",
      staff_id: "staff-anna",
      shift_id: "shift-morning",
      date: monday,
      status: "scheduled",
      staff: { id: "staff-anna", employee_id: "EMP-01", name: "Anna" },
      shift: { id: "shift-morning", name: "Morning Shift", start_time: "06:00:00", end_time: "14:00:00" },
      created_at: "",
      updated_at: "",
    },
  ];
});

describe("SchedulePage management", () => {
  it("renders the week grid assignment for admin", () => {
    render(<SchedulePage />);
    expect(screen.getByText("Morning Shift")).toBeInTheDocument();
  });

  it("lets admin edit a schedule", async () => {
    render(<SchedulePage />);
    await userEvent.click(screen.getByTitle("View shift details"));
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Status")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Save Changes" }));
    expect(state.updateMutate).toHaveBeenCalledWith(
      { id: "sched-1", data: expect.objectContaining({ status: "scheduled" }) },
      expect.any(Object)
    );
  });

  it("lets admin remove a schedule after confirmation", async () => {
    render(<SchedulePage />);
    await userEvent.click(screen.getByTitle("View shift details"));
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(state.removeMutate).toHaveBeenCalledWith("sched-1", expect.any(Object));
  });

  it("hides edit and remove controls from operational staff", async () => {
    state.role = "waiter";
    render(<SchedulePage />);
    await userEvent.click(screen.getByTitle("View shift details"));
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });
});
