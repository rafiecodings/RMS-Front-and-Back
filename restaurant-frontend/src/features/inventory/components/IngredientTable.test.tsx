import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { IngredientTable } from "./IngredientTable";
import type { Ingredient } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children?: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const ingredient: Ingredient = {
  id: "ing-1",
  name: "Tomato",
  unit: "kg",
  current_stock: 50,
  minimum_stock: 20,
  maximum_stock: 100,
  cost_per_unit: 120,
  category: "vegetables",
  is_active: true,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

const baseProps = {
  ingredients: [ingredient],
  isLoading: false,
  search: "",
  onSearchChange: vi.fn(),
  categoryFilter: "all",
  onCategoryFilterChange: vi.fn(),
  currentPage: 1,
  totalPages: 1,
  onPageChange: vi.fn(),
};

describe("IngredientTable", () => {
  it("renders ingredient rows with stock details", () => {
    render(<IngredientTable {...baseProps} />);

    expect(screen.getByText("Tomato")).toBeInTheDocument();
    expect(screen.getByText("vegetables")).toBeInTheDocument();
    expect(screen.getByText("50 kg")).toBeInTheDocument();
    expect(screen.getByText("₱120")).toBeInTheDocument();
    expect(screen.getByText("In Stock")).toBeInTheDocument();
  });

  it("marks low stock ingredients", () => {
    render(
      <IngredientTable
        {...baseProps}
        ingredients={[{ ...ingredient, current_stock: 10, minimum_stock: 20 }]}
      />
    );
    expect(screen.getByText("Low Stock")).toBeInTheDocument();
  });

  it("shows an empty state when there are no ingredients", () => {
    render(<IngredientTable {...baseProps} ingredients={[]} />);
    expect(screen.getByText("No ingredients found")).toBeInTheDocument();
  });

  it("renders pagination controls when there are multiple pages", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <IngredientTable
        {...baseProps}
        totalPages={2}
        currentPage={1}
        onPageChange={onPageChange}
      />
    );

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    // Prev is disabled on page 1.
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "2" }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});