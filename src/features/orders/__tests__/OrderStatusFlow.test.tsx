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

  it("shows Mark as Served for a ready order when serving is allowed", () => {
    const onStatusChange = vi.fn();
    render(
      <OrderStatusSelect
        currentStatus="ready"
        onStatusChange={onStatusChange}
        canServe
      />
    );
    const button = screen.getByRole("button", { name: /Mark as Served/i });
    expect(button).toBeInTheDocument();
  });

  it("hides Mark as Served for non-ready or unauthorized roles", () => {
    const { container, rerender } = render(
      <OrderStatusSelect
        currentStatus="confirmed"
        onStatusChange={vi.fn()}
        canServe
      />
    );
    expect(
      screen.queryByRole("button", { name: /Mark as Served/i })
    ).toBeNull();

    rerender(
      <OrderStatusSelect
        currentStatus="ready"
        onStatusChange={vi.fn()}
        canServe={false}
      />
    );
    expect(
      screen.queryByRole("button", { name: /Mark as Served/i })
    ).toBeNull();
    expect(container.querySelector("button")).toBeNull();

    rerender(
      <OrderStatusSelect
        currentStatus="served"
        onStatusChange={vi.fn()}
        canServe
      />
    );
    expect(
      screen.queryByRole("button", { name: /Mark as Served/i })
    ).toBeNull();
  });

  it("fires a single served transition on click", async () => {
    const onStatusChange = vi.fn();
    const { getByRole } = render(
      <OrderStatusSelect
        currentStatus="ready"
        onStatusChange={onStatusChange}
        canServe
      />
    );
    getByRole("button", { name: /Mark as Served/i }).click();
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith("served");
  });
});
