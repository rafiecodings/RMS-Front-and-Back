import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PosOrderScreen } from "../PosOrderScreen";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({
  create: { mutateAsync: vi.fn(), isPending: false },
  updateStatus: { mutateAsync: vi.fn(), isPending: false },
}));

vi.mock("@/lib/hooks", () => {
  return {
    useMenuCategories: () => ({
      list: {
        data: [
          {
            id: "cat-1",
            name: "Mains",
            description: "",
            sort_order: 0,
            is_active: true,
            items_count: 0,
            created_at: "",
            updated_at: "",
          },
        ],
        isLoading: false,
      },
    }),
    useMenuItems: () => ({
      list: {
        data: {
          data: {
            data: [
              {
                id: "mi-1",
                category_id: "cat-1",
                name: "Burger",
                price: 120,
                is_available: true,
              },
              {
                id: "mi-2",
                category_id: "cat-1",
                name: "Fries",
                price: 50,
                is_available: true,
              },
              {
                id: "mi-3",
                category_id: "cat-1",
                name: "Unavailable",
                price: 999,
                is_available: false,
              },
            ],
          },
        },
        isLoading: false,
      },
    }),
    useCustomers: () => ({
      list: {
        data: {
          data: {
            data: [{ id: "cust-1", name: "John" }],
          },
        },
        isLoading: false,
      },
    }),
    useTables: () => ({
      list: {
        data: [
          {
            id: "t-1",
            number: "5",
            capacity: 4,
            status: "available",
            name: "T5",
            is_wheelchair_accessible: false,
          },
        ],
        isLoading: false,
      },
    }),
    useOrders: () => ({ create: mocks.create, updateStatus: mocks.updateStatus }),
  };
});

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.create.mutateAsync.mockResolvedValue({
    data: { data: { id: "ord-1", order_number: "ORD-1" } },
  });
  mocks.updateStatus.mutateAsync.mockResolvedValue({ data: { data: {} } });
});

describe("PosOrderScreen", () => {
  it("renders available menu items and category nav", () => {
    renderWithProviders(<PosOrderScreen />);

    expect(screen.getByText("Mains")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Burger/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Fries/i })).toBeInTheDocument();
    // Unavailable items are not selectable
    expect(
      screen.queryByRole("button", { name: /Unavailable/i })
    ).toBeDisabled();
    expect(screen.getByText("Send to Kitchen")).toBeInTheDocument();
    expect(screen.getByText("Cart is empty")).toBeInTheDocument();
  });

  it("adds an item, increments and removes it from the cart", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PosOrderScreen />);

    await user.click(screen.getByRole("button", { name: /Add Burger to order/i }));

    // Cart shows one item and the running total
    expect(screen.getByText("1 item")).toBeInTheDocument();
    // ₱120 also appears on the menu grid, so assert presence not uniqueness
    expect(screen.getAllByText("₱120").length).toBeGreaterThan(0);

    // Increment quantity
    await user.click(
      screen.getByRole("button", { name: /Increase Burger quantity/i })
    );
    expect(screen.getByText("2 items")).toBeInTheDocument();
    expect(screen.getByText("₱240")).toBeInTheDocument();

    // Decrement back to 1
    await user.click(
      screen.getByRole("button", { name: /Decrease Burger quantity/i })
    );
    expect(screen.getByText("1 item")).toBeInTheDocument();

    // Remove the item entirely
    await user.click(screen.getByRole("button", { name: /Remove Burger/i }));
    expect(screen.getByText("Cart is empty")).toBeInTheDocument();
    expect(screen.getByText("Send to Kitchen")).toBeDisabled();
  });

  it("sends the order to the kitchen (create + confirm)", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PosOrderScreen />);

    await user.click(screen.getByRole("button", { name: /Burger/i }));
    await user.click(screen.getByRole("button", { name: /Send to Kitchen/i }));

    expect(mocks.create.mutateAsync).toHaveBeenCalledTimes(1);
    const createPayload = mocks.create.mutateAsync.mock.calls[0][0];
    expect(createPayload.items).toHaveLength(1);
    expect(createPayload.items[0].menu_item_id).toBe("mi-1");
    expect(createPayload.order_type).toBe("dine_in");

    expect(mocks.updateStatus.mutateAsync).toHaveBeenCalledTimes(1);
    expect(mocks.updateStatus.mutateAsync.mock.calls[0][0]).toEqual({
      id: "ord-1",
      status: "confirmed",
    });
  });

  it("disables Send to Kitchen while the cart is empty", () => {
    renderWithProviders(<PosOrderScreen />);
    expect(screen.getByRole("button", { name: /Send to Kitchen/i })).toBeDisabled();
  });

  it("hides the table selector for non-dine-in order types", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PosOrderScreen />);

    expect(screen.getByText("Table")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /takeaway/i }));
    expect(screen.queryByText("Table")).not.toBeInTheDocument();
  });
});
