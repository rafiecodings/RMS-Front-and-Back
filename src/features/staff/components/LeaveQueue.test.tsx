import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeaveQueue } from "./LeaveQueue";
import type { LeaveRequest } from "@/lib/types";

const state = vi.hoisted(() => ({
  list: { data: null as { data: { data: LeaveRequest[] } } | null, isLoading: false, isError: false },
  approve: { mutate: vi.fn(), isPending: false },
  reject: { mutate: vi.fn(), isPending: false },
}));
vi.mock("@/lib/hooks/useStaff", () => ({
  useLeaveRequests: () => ({ list: state.list, approve: state.approve, reject: state.reject }),
}));

const requested: LeaveRequest = { id: "l1", staff_id: "s1", leave_type: "vacation", reason: "trip", start_date: "2026-12-10", end_date: "2026-12-11", status: "requested", requested_at: "", decided_by: null, decided_at: null, decision_notes: null, staff: { id: "s1", employee_id: "EMP-10", name: "Mona" }, created_at: "", updated_at: "" };
const approved: LeaveRequest = { id: "l2", staff_id: "s2", leave_type: "sick", reason: "flu", start_date: "2026-12-12", end_date: "2026-12-12", status: "approved", requested_at: "", decided_by: "u", decided_at: "", decision_notes: null, staff: { id: "s2", employee_id: "EMP-11", name: "Jon" }, created_at: "", updated_at: "" };

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(state.list, { data: { data: { data: [requested, approved] } }, isLoading: false, isError: false });
});

describe("LeaveQueue", () => {
  it("renders pending request with approve/reject", () => {
    render(<LeaveQueue />);
    expect(screen.getByText("EMP-10 — Mona")).toBeInTheDocument();
    expect(screen.getByText("2026-12-10 to 2026-12-11")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("calls approve with decision notes", async () => {
    render(<LeaveQueue />);
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(state.approve.mutate).toHaveBeenCalledWith(expect.objectContaining({ id: "l1" }), expect.any(Object));
  });

  it("hides actions for terminal status", () => {
    Object.assign(state.list, { data: { data: { data: [approved] } } });
    render(<LeaveQueue />);
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
    expect(screen.getAllByText("approved").length).toBeGreaterThan(0);
  });

  it("shows leave type and date range", () => {
    render(<LeaveQueue />);
    expect(screen.getByText("vacation")).toBeInTheDocument();
    expect(screen.getByText("trip")).toBeInTheDocument();
  });

  it("shows no UUIDs", () => {
    const { container } = render(<LeaveQueue />);
    expect(container.textContent).not.toContain("l1");
    expect(container.textContent).not.toContain("s1");
  });
});
