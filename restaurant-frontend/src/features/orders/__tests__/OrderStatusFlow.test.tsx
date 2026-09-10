import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrderTimeline } from "../OrderTimeline";
import { OrderStatusSelect } from "../OrderStatusSelect";

describe("OrderTimeline", () => {
  it("renders Pending as the first stage, not Draft", () => {
    const { container } = render(
      <OrderTimeline order={{ status: "pending" }} />
    );
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Draft/);
  });

  it("marks Pending active for a pending order", () => {
    render(<OrderTimeline order={{ status: "pending" }} />);
    const pending = screen.getByText("Pending");
    expect(pending.className).toMatch(/text-foreground/);
  });

  it("marks Pending completed when order is confirmed", () => {
    const { container } = render(
      <OrderTimeline order={{ status: "confirmed" }} />
    );
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(container.querySelectorAll(".bg-emerald-500").length).toBeGreaterThan(0);
  });
});

describe("OrderStatusSelect", () => {
  it("shows Send to Kitchen for a pending order when confirmation is allowed", () => {
    render(
      <OrderStatusSelect
        currentStatus="pending"
        onStatusChange={vi.fn()}
        canConfirm
      />
    );
    expect(
      screen.getByRole("button", { name: /Send to Kitchen/i })
    ).toBeInTheDocument();
  });

  it("hides the action for a pending order when confirmation is not allowed", () => {
    const { container } = render(
      <OrderStatusSelect
        currentStatus="pending"
        onStatusChange={vi.fn()}
        canConfirm={false}
      />
    );
    expect(container.querySelector("button")).toBeNull();
  });

  it("disables Send to Kitchen while the mutation is pending", () => {
    render(
      <OrderStatusSelect
        currentStatus="pending"
        onStatusChange={vi.fn()}
        disabled
      />
    );
    expect(
      screen.getByRole("button", { name: /Send to Kitchen/i })
    ).toBeDisabled();
  });
});
