import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReservationForm } from "../ReservationForm";

vi.mock("@/lib/hooks", () => ({
  useCustomers: () => ({
    list: { data: { data: { data: [] } }, isLoading: false },
  }),
  useReservations: () => ({
    availableTables: {
      isSuccess: true,
      data: [
        { id: "t-1", number: "1", capacity: 4, status: "available", is_active: true },
        { id: "t-2", number: "2", capacity: 4, status: "needs_cleaning", is_active: true },
        { id: "t-3", number: "3", capacity: 4, status: "maintenance", is_active: true },
        { id: "t-4", number: "4", capacity: 4, status: "available", is_active: false },
      ],
    },
  }),
}));

describe("ReservationForm table availability", () => {
  it("excludes needs_cleaning, maintenance and archived tables", async () => {
    const user = userEvent.setup();
    render(<ReservationForm onSubmit={vi.fn()} />);

    const triggers = screen.getAllByRole("combobox");
    // reservation-for, customer, table — the table trigger shows the
    // "Auto-assign or select" placeholder when nothing is selected.
    const tableTrigger = triggers.find((t) =>
      t.textContent?.includes("Auto-assign or select")
    );
    expect(tableTrigger).toBeTruthy();
    await user.click(tableTrigger!);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /T1 —/ })).toBeInTheDocument();
    });
    expect(screen.queryByRole("option", { name: /T2 —/ })).toBeNull();
    expect(screen.queryByRole("option", { name: /T3 —/ })).toBeNull();
    expect(screen.queryByRole("option", { name: /T4 —/ })).toBeNull();
  });
});
