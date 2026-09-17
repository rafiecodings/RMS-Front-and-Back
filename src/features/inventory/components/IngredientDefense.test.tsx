import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IngredientForm } from "./IngredientForm";
import { IngredientTable } from "./IngredientTable";
import { canManageIngredients } from "@/lib/utils/permissions";
import type { Ingredient } from "@/lib/types";

vi.mock("@/lib/hooks", () => ({
  useSuppliers: () => ({
    list: { data: { data: { data: [{ id: "sup-1", name: "Acme Foods" }] } } },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn() }),
}));

const ingredient: Ingredient = {
  id: "ing-1",
  name: "Chicken Breast",
  unit: "kg",
  current_stock: 50,
  minimum_stock: 10,
  maximum_stock: 100,
  cost_per_unit: 120,
  category: "meat",
  supplier_id: "sup-1",
  supplier: { id: "sup-1", name: "Acme Foods" } as never,
  is_active: true,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

const tableBase = {
  ingredients: [ingredient],
  isLoading: false,
  isError: false,
  search: "",
  onSearchChange: vi.fn(),
  categoryFilter: "all",
  onCategoryFilterChange: vi.fn(),
  currentPage: 1,
  totalPages: 1,
  onPageChange: vi.fn(),
};

describe("Ingredient defense", () => {
  it("A/E: admin+manager manage, inventory_staff view-only", () => {
    expect(canManageIngredients("admin")).toBe(true);
    expect(canManageIngredients("manager")).toBe(true);
    expect(canManageIngredients("inventory_staff")).toBe(false);
    expect(canManageIngredients("waiter")).toBe(false);
    expect(canManageIngredients("cashier")).toBe(false);
  });

  it("B/C/D: table hides Edit when canEdit false", () => {
    const { rerender } = render(
      <IngredientTable {...tableBase} canEdit={false} onEdit={vi.fn()} onView={vi.fn()} />
    );
    expect(screen.queryByLabelText("Edit Chicken Breast")).not.toBeInTheDocument();
    rerender(
      <IngredientTable {...tableBase} canEdit={true} onEdit={vi.fn()} onView={vi.fn()} />
    );
    expect(screen.getByLabelText("Edit Chicken Breast")).toBeInTheDocument();
  });

  it("F: edit mode Current Stock is read-only with helper", () => {
    render(<IngredientForm initialData={ingredient} onSubmit={vi.fn()} />);
    expect(screen.getByText("50 kg")).toBeInTheDocument();
    expect(
      screen.getByText("Use Adjust Stock to change inventory quantity.")
    ).toBeInTheDocument();
    expect(screen.queryByDisplayValue("50")).not.toBeInTheDocument();
  });

  it("G: create mode Current Stock remains editable", () => {
    render(<IngredientForm onSubmit={vi.fn()} />);
    const input = screen.getByLabelText(/Current Stock/i);
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
  });

  it("H: pagination hidden on error", () => {
    render(<IngredientTable {...tableBase} isError={true} totalPages={3} />);
    expect(screen.queryByText(/Page 1 of/)).not.toBeInTheDocument();
  });

  it("I: supplier label human-readable, no UUID", () => {
    const uuid = "11111111-2222-3333-4444-555555555555";
    render(<IngredientForm onSubmit={vi.fn()} />);
    expect(screen.queryByText(uuid)).not.toBeInTheDocument();
    render(
      <IngredientTable
        {...tableBase}
        ingredients={[{ ...ingredient, supplier_id: uuid }]}
      />
    );
    expect(screen.queryByText(uuid)).not.toBeInTheDocument();
  });

  it("no Description field in form", () => {
    render(<IngredientForm onSubmit={vi.fn()} />);
    expect(screen.queryByLabelText(/Description/i)).not.toBeInTheDocument();
  });
});
