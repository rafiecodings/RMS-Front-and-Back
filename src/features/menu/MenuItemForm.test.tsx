import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MenuItemForm } from "./MenuItemForm";
import type { MenuCategory } from "@/lib/types";

const category: MenuCategory = {
  id: "c-1",
  name: "Mains",
  slug: "mains",
  is_active: true,
  sort_order: 0,
  items_count: 0,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
} as MenuCategory;

describe("MenuItemForm price validation", () => {
  it("rejects a price of zero and does not submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <MenuItemForm
        categories={[category]}
        onSubmit={onSubmit}
        submitLabel="Save Item"
      />
    );

    const price = screen.getByLabelText("Price (PHP) *");
    await user.clear(price);
    await user.type(price, "0");

    await user.click(screen.getByText("Save Item"));

    expect(await screen.findByText("Price must be greater than 0")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
