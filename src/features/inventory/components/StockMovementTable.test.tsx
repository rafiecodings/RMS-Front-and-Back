import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StockMovementTable } from "./StockMovementTable";
import type { StockMovement } from "@/lib/types";

const ingredient = {
  id: "i-1",
  name: "Tomato",
  unit: "kg",
  current_stock: 5,
  minimum_stock: 1,
  maximum_stock: 10,
  cost_per_unit: 1,
  is_active: true,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

describe("StockMovementTable", () => {
  it("labels a wastage movement distinctly from outward", () => {
    const movements: StockMovement[] = [
      {
        id: "m-1",
        ingredient_id: "i-1",
        ingredient,
        type: "wastage",
        quantity: 2,
        created_at: "2026-01-01",
      },
      {
        id: "m-2",
        ingredient_id: "i-1",
        ingredient,
        type: "outward",
        quantity: 1,
        created_at: "2026-01-01",
      },
    ];

    render(<StockMovementTable movements={movements} isLoading={false} />);

    const wastageBadges = screen.getAllByText("Wastage");
    expect(wastageBadges.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Outward")).toBeInTheDocument();
  });
});
