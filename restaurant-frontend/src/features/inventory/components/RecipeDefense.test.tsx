import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecipeForm } from "./RecipeForm";
import type { RecipeFormData } from "@/lib/types";

vi.mock("@/lib/hooks", () => ({
  useIngredients: () => ({
    list: {
      data: {
        data: {
          data: [
            { id: "ing-1", name: "Chicken Breast", unit: "kg", is_active: true },
            { id: "ing-2", name: "Salt", unit: "g", is_active: true },
          ],
        },
      },
    },
  }),
  useMenuItems: () => ({
    list: { data: { data: { data: [{ id: "mi-1", name: "Grilled Chicken" }] } } },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn() }),
}));

const filled: RecipeFormData = {
  menu_item_id: "mi-1",
  instructions: "",
  yield_quantity: 1,
  yield_unit: "serving",
  ingredients: [{ ingredient_id: "ing-1", quantity: 0.5, unit: "kg" }],
};

describe("Recipe defense", () => {
  it("L: row shows human name", () => {
    render(<RecipeForm initialData={filled} onSubmit={vi.fn()} />);
    expect(screen.getByText("Chicken Breast")).toBeInTheDocument();
  });

  it("M: unit is read-only label, not editable Select", () => {
    render(<RecipeForm initialData={filled} onSubmit={vi.fn()} />);
    expect(screen.getByText("kg")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /unit/i })).not.toBeInTheDocument();
  });

  it("N: unit derives from ingredient", () => {
    render(<RecipeForm initialData={filled} onSubmit={vi.fn()} />);
    expect(screen.getByText("kg")).toBeInTheDocument();
    expect(screen.queryByText("11111111-2222-3333-4444-555555555555")).not.toBeInTheDocument();
  });

  it("O: stale ingredient shows Unavailable, not UUID", () => {
    const uuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    render(
      <RecipeForm
        initialData={{
          ...filled,
          ingredients: [{ ingredient_id: uuid, quantity: 1, unit: "kg" }],
        }}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText("Unavailable ingredient")).toBeInTheDocument();
    expect(screen.queryByText(uuid)).not.toBeInTheDocument();
  });

  it("R: Instructions shows optional", () => {
    render(<RecipeForm onSubmit={vi.fn()} />);
    expect(screen.getByText("Instructions (optional)")).toBeInTheDocument();
  });
});
