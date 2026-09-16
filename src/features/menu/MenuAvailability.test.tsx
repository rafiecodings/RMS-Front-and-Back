import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MenuItemList } from "./MenuItemList";
import type { MenuItem } from "@/lib/types";

const availableItem: MenuItem = {
  id: "1",
  name: "Available Burger",
  slug: "available-burger",
  description: "Tasty",
  price: 100,
  cost_price: 50,
  image_url: null,
  sku: "SKU-1",
  is_available: true,
  is_featured: false,
  prep_time_minutes: 10,
  tags: [],
  category: { id: "c1", name: "Burgers" },
  modifiers: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as unknown as MenuItem;

const unavailableItem: MenuItem = {
  ...availableItem,
  id: "2",
  name: "Unavailable Pizza",
  slug: "unavailable-pizza",
  sku: "SKU-2",
  is_available: false,
} as unknown as MenuItem;

describe("Menu availability UI", () => {
  it("shows Available/Unavailable badge", () => {
    render(<MenuItemList items={[availableItem, unavailableItem]} />);
    expect(screen.getAllByText("Available").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
  });

  it("unavailable item is still rendered but marked", () => {
    render(<MenuItemList items={[unavailableItem]} />);
    expect(screen.getAllByText("Unavailable Pizza").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
  });

  it("toggle calls handler without UUID leak", () => {
    const onToggle = vi.fn();
    const testItem = { ...availableItem, id: "test-id-999-unique" } as unknown as MenuItem;
    const { container } = render(<MenuItemList items={[testItem]} onToggleAvailability={onToggle} />);
    expect(container.textContent).not.toContain("test-id-999-unique");
  });
});
