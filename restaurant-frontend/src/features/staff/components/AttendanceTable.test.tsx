import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AttendanceTable } from "./AttendanceTable";

it("renders backend hours_worked including zero, and employee ID when no user is linked", () => {
  render(<AttendanceTable
    records={[7.5, 0, null].map((hours, i) => ({ id: String(i), staff_id: "staff", staff: { id: "staff", employee_id: "EMP-01", name: null }, clock_in: "2026-01-01T08:00:00Z", hours_worked: hours, status: "present" }))}
    isLoading={false} search="" onSearchChange={vi.fn()} statusFilter="all" onStatusFilterChange={vi.fn()}
    currentPage={1} totalPages={1} onPageChange={vi.fn()}
  />);
  expect(screen.getByText("7.5h")).toBeInTheDocument();
  expect(screen.getByText("0.0h")).toBeInTheDocument();
  expect(screen.getAllByText("EMP-01")).toHaveLength(3);
});
