import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PaymentDialog } from "./PaymentDialog";
import type { PaymentLine } from "../types";
import type { ReactNode } from "react";

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  totalAmount: 500,
  discountAmount: 50,
  vatAmount: 60,
  serviceChargeAmount: 0,
  subtotal: 510,
  onProcessPayment: vi.fn(),
  isProcessing: false,
};

describe("PaymentDialog", () => {
  it("renders the totals summary", () => {
    renderWithProviders(<PaymentDialog {...baseProps} />);

    expect(screen.getByRole("heading", { name: "Process Payment" })).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("₱510")).toBeInTheDocument();
    expect(screen.getByText("₱60")).toBeInTheDocument();
    expect(screen.getAllByText("₱500")).toHaveLength(1);
    expect(screen.getByText("₱0")).toBeInTheDocument();
  });

  it("keeps Process Payment disabled until the total is fully paid", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PaymentDialog {...baseProps} />);

    const processButton = screen.getByRole("button", { name: "Process Payment" });
    expect(processButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText("0.00"), "500");

    expect(processButton).toBeEnabled();
    expect(screen.getAllByText("₱500")).toHaveLength(2);
    expect(screen.queryByText("Remaining")).not.toBeInTheDocument();
  });

  it("processes payment with the entered amount", async () => {
    const user = userEvent.setup();
    const onProcessPayment = vi.fn();
    renderWithProviders(<PaymentDialog {...baseProps} onProcessPayment={onProcessPayment} />);

    await user.type(screen.getByPlaceholderText("0.00"), "500");
    await user.click(screen.getByRole("button", { name: "Process Payment" }));

    expect(onProcessPayment).toHaveBeenCalledTimes(1);
    const [payments] = onProcessPayment.mock.calls[0] as [PaymentLine[]];
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({ method: "cash", amount: 500 });
  });

  it("supports multiple split payment lines", async () => {
    const user = userEvent.setup();
    const onProcessPayment = vi.fn();
    renderWithProviders(<PaymentDialog {...baseProps} onProcessPayment={onProcessPayment} />);

    await user.click(screen.getByRole("button", { name: "Add Method" }));

    const amountInputs = screen.getAllByPlaceholderText("0.00");
    expect(amountInputs).toHaveLength(2);

    await user.type(amountInputs[0], "300");
    await user.type(amountInputs[1], "200");

    const processButton = screen.getByRole("button", { name: "Process Payment" });
    expect(processButton).toBeEnabled();
    await user.click(processButton);

    expect(onProcessPayment).toHaveBeenCalledTimes(1);
    const [payments] = onProcessPayment.mock.calls[0] as [PaymentLine[]];
    expect(payments).toHaveLength(2);
    expect(payments.map((p) => p.amount)).toEqual([300, 200]);
  });

  it("blocks payment when amount is insufficient and shows validation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PaymentDialog {...baseProps} />);

    await user.type(screen.getByPlaceholderText("0.00"), "100");

    const processButton = screen.getByRole("button", { name: "Process Payment" });
    expect(processButton).toBeDisabled();
    expect(
      screen.getByText(/does not cover the total/i)
    ).toBeInTheDocument();
  });

  it("disables the process button while processing", () => {
    renderWithProviders(<PaymentDialog {...baseProps} isProcessing />);
    expect(
      screen.getByRole("button", { name: "Process Payment" })
    ).toBeDisabled();
  });
});
