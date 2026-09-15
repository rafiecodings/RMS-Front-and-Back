import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PerformanceCard } from "./PerformanceCard";
import type { StaffPerformance } from "@/lib/types";

const perf: StaffPerformance = {
  staff: { id: "s1", employee_id: "EMP-01", name: "Anna" },
  period: { start_date: "2026-04-01", end_date: "2026-04-30" },
  orders_handled: 5,
  total_sales: 1234.5,
  hours_worked: 80,
  days_present: 10,
};

describe("PerformanceCard", () => {
  it("renders real metrics", () => {
    render(<PerformanceCard performance={perf} isLoading={false} />);
    expect(screen.getByText("Orders Handled")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText(/1,234/)).toBeInTheDocument();
    expect(screen.getByText("80.0h")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("EMP-01 — Anna")).toBeInTheDocument();
  });

  it("does not render unsupported fake metrics", () => {
    render(<PerformanceCard performance={perf} isLoading={false} />);
    expect(screen.queryByText(/Tables Served/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Punctuality/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Feedback/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Rating/i)).not.toBeInTheDocument();
  });

  it("shows loading skeletons", () => {
    const { container } = render(<PerformanceCard performance={undefined} isLoading={true} />);
    expect(container.querySelectorAll(".h-28").length).toBeGreaterThan(0);
  });

  it("shows empty state", () => {
    render(<PerformanceCard performance={undefined} isLoading={false} />);
    expect(screen.getByText(/No performance data/)).toBeInTheDocument();
  });

  it("shows no UUIDs", () => {
    const { container } = render(<PerformanceCard performance={perf} isLoading={false} />);
    expect(container.textContent).not.toContain("s1");
  });
});
