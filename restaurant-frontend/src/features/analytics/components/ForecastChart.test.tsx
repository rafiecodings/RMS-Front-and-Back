import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ForecastChart } from "./ForecastChart";
import type { ForecastPrediction } from "../types";

vi.mock("recharts", async () => {
  const React = await import("react");
  const ResponsiveContainer = ({
    children,
    width,
    height,
  }: {
    children?: React.ReactNode;
    width?: number | string;
    height?: number | string;
  }) =>
    React.createElement(
      "div",
      {
        "data-testid": "responsive-container",
        style: { width, height },
      },
      children
    );
  return {
    ResponsiveContainer,
    ComposedChart: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("svg", null, children),
    Area: () => null,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Legend: () => null,
    CartesianGrid: () => null,
  };
});

const predictions: ForecastPrediction[] = [
  { date: "2026-08-01", qty: 120, lower_ci: 100, upper_ci: 140 },
  { date: "2026-08-02", qty: 90, lower_ci: 70, upper_ci: 110 },
];

describe("ForecastChart", () => {
  it("renders the forecast card title", () => {
    render(<ForecastChart data={predictions} />);
    expect(screen.getByText("Daily Demand Forecast")).toBeInTheDocument();
  });

  it("shows the empty state when there is no data", () => {
    render(<ForecastChart data={[]} />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
    expect(screen.queryByTestId("responsive-container")).not.toBeInTheDocument();
  });

  it("renders the chart when data is present", () => {
    render(<ForecastChart data={predictions} />);
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.queryByText("No data available")).not.toBeInTheDocument();
  });

  it("opens the fullscreen dialog when the expand button is clicked", async () => {
    const user = userEvent.setup();
    render(<ForecastChart data={predictions} />);

    expect(screen.getAllByText("Daily Demand Forecast")).toHaveLength(1);

    await user.click(screen.getByRole("button"));
    expect(screen.getAllByText("Daily Demand Forecast")).toHaveLength(2);
  });
});
