import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShiftForm } from "./ShiftForm";
import type { Staff } from "@/lib/types";

const shiftOptions = [
  { id: "shift-morning-uuid-1", name: "Morning Shift", start_time: "06:00:00", end_time: "14:00:00" },
  { id: "shift-afternoon-uuid-2", name: "Afternoon Shift", start_time: "14:00:00", end_time: "22:00:00" },
  { id: "shift-night-uuid-3", name: "Night Shift", start_time: "22:00:00", end_time: "06:00:00" },
];
vi.mock("@/lib/hooks", () => ({
  useStaffShifts: () => ({ data: shiftOptions }),
}));

const staff: Staff[] = [
  { id: "staff-uuid-anna-1", user_id: "u1", user: { id: "u1", name: "Jayson Statham", email: "j@x.ph", role: "waiter" } as never, employee_id: "EMP-MTCHZR2C", is_active: true, hire_date: "2026-01-01", created_at: "", updated_at: "" },
  { id: "staff-uuid-bob-2", user_id: "u2", user: { id: "u2", name: "Andrea Reyes", email: "a@x.ph", role: "waiter" } as never, employee_id: "EMP-XYZ123", is_active: true, hire_date: "2026-01-01", created_at: "", updated_at: "" },
  { id: "staff-uuid-inactive", user_id: "u3", user: { id: "u3", name: "Inactive Guy", email: "i@x.ph", role: "waiter" } as never, employee_id: "EMP-INACTIVE", is_active: false, hire_date: "2026-01-01", created_at: "", updated_at: "" },
];

describe("ShiftForm dropdown labels", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders staff options as employee_id — name and hides UUIDs", async () => {
    render(<ShiftForm staffList={staff} onSubmit={vi.fn()} defaultDate="2026-04-10" />);
    const combos = screen.getAllByRole("combobox");
    await userEvent.click(combos[0]);
    expect(screen.getByText("EMP-MTCHZR2C — Jayson Statham")).toBeInTheDocument();
    expect(screen.getByText("EMP-XYZ123 — Andrea Reyes")).toBeInTheDocument();
    expect(screen.queryByText("staff-uuid-anna-1")).not.toBeInTheDocument();
    expect(screen.queryByText("staff-uuid-bob-2")).not.toBeInTheDocument();
    expect(screen.queryByText(/Inactive Guy/)).not.toBeInTheDocument();
  });

  it("renders shift options as shift name + time and hides UUIDs", async () => {
    render(<ShiftForm staffList={staff} onSubmit={vi.fn()} defaultDate="2026-04-10" />);
    // Open shift select (second combobox)
    const combos = screen.getAllByRole("combobox");
    const shiftCombo = combos[1];
    await userEvent.click(shiftCombo);
    expect(screen.getByText("Morning Shift (06:00 - 14:00)")).toBeInTheDocument();
    expect(screen.getByText("Afternoon Shift (14:00 - 22:00)")).toBeInTheDocument();
    expect(screen.getByText("Night Shift (22:00 - 06:00)")).toBeInTheDocument();
    expect(screen.queryByText("shift-morning-uuid-1")).not.toBeInTheDocument();
    const { container } = render(<ShiftForm staffList={staff} onSubmit={vi.fn()} />);
    expect(container.textContent).not.toContain("shift-morning-uuid");
  });

  it("edit/reschedule shift dropdown also shows readable labels (checked via ShiftForm reuse)", async () => {
    // Reusing ShiftForm for edit scenario — label logic is shared, so same assertions apply
    render(<ShiftForm staffList={staff} onSubmit={vi.fn()} />);
    await userEvent.click(screen.getAllByRole("combobox")[1]);
    expect(screen.getByText("Morning Shift (06:00 - 14:00)")).toBeInTheDocument();
  });
});
