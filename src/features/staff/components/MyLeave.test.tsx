import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MyLeave } from "./MyLeave";
import type { LeaveRequest, Staff } from "@/lib/types";

const state = vi.hoisted(() => ({
  profile: { data: null as Staff | null, isLoading: false, isError: false },
  list: { data: null as { data: { data: LeaveRequest[] } } | null, isLoading: false, isError: false },
  create: { mutate: vi.fn(), isPending: false },
  cancel: { mutate: vi.fn(), isPending: false },
}));
vi.mock("@/lib/hooks/useStaff", () => ({
  useCurrentStaff: () => state.profile,
  useLeaveRequests: () => ({ list: state.list, create: state.create, cancel: state.cancel }),
}));

const own: Staff = { id: "own-id", user_id: "u1", employee_id: "EMP-01", is_active: true, hire_date: "2026-01-01", created_at: "", updated_at: "" };

const ownLeave: LeaveRequest = {
  id: "leave-own", staff_id: "own-id", leave_type: "sick", reason: "flu", start_date: "2026-12-01", end_date: "2026-12-02", status: "requested", requested_at: "", decided_by: null, decided_at: null, decision_notes: null, staff: { id: "own-id", employee_id: "EMP-01", name: "Anna" }, created_at: "", updated_at: "",
};
const otherLeave: LeaveRequest = {
  id: "leave-other", staff_id: "other-id", leave_type: "vacation", reason: "trip", start_date: "2026-12-03", end_date: "2026-12-03", status: "requested", requested_at: "", decided_by: null, decided_at: null, decision_notes: null, staff: { id: "other-id", employee_id: "EMP-99", name: "Bob" }, created_at: "", updated_at: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(state.profile, { data: { ...own }, isLoading: false, isError: false });
  Object.assign(state.list, { data: { data: { data: [ownLeave, otherLeave] } }, isLoading: false, isError: false });
  state.create.isPending = false;
  state.cancel.isPending = false;
});

describe("MyLeave", () => {
  it("shows leave form via Request Leave modal and history for own requests only", async () => {
    render(<MyLeave />);
    expect(screen.queryByLabelText("Leave request form")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Request Leave" }));
    expect(screen.getByLabelText("Leave request form")).toBeInTheDocument();
    expect(screen.getAllByText("Sick Leave").length).toBeGreaterThan(0);
    expect(screen.getByText("Dec 1, 2026 – Dec 2, 2026")).toBeInTheDocument();
    expect(screen.queryByText("Dec 3, 2026")).not.toBeInTheDocument();
  });

  it("shows details modal with labeled fields and hides decision note when empty", async () => {
    render(<MyLeave />);
    await userEvent.click(screen.getByText("Dec 1, 2026 – Dec 2, 2026"));
    expect(screen.getByText("Leave Details")).toBeInTheDocument();
    expect(screen.getByText("Leave Type")).toBeInTheDocument();
    expect(screen.getByText("Date Range")).toBeInTheDocument();
    expect(screen.getByText("Reason")).toBeInTheDocument();
    expect(screen.queryByText("Decision Note")).not.toBeInTheDocument();
  });

  it("renders Sick Leave label not raw sick enum", () => {
    render(<MyLeave />);
    expect(screen.getByText("Sick Leave")).toBeInTheDocument();
    expect(screen.queryByText(/^sick$/)).not.toBeInTheDocument();
    expect(screen.queryByText("vacation")).not.toBeInTheDocument();
  });

  it("can cancel requested leave", async () => {
    render(<MyLeave />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(state.cancel.mutate).toHaveBeenCalledWith("leave-own", expect.any(Object));
  });

  it("does not expose approve/reject", () => {
    render(<MyLeave />);
    expect(screen.queryByRole("button", { name: /Approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reject/i })).not.toBeInTheDocument();
  });

  it("shows no UUIDs in labels", () => {
    const { container } = render(<MyLeave />);
    expect(container.textContent).not.toContain("own-id");
    expect(container.textContent).not.toContain("leave-own");
  });
});
