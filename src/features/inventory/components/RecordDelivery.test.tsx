import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecordDeliveryDialog } from "./RecordDeliveryDialog";
import { canRecordDelivery, canManageIngredients } from "@/lib/utils/permissions";

describe("Record Delivery", () => {
  it("permission matrix: staff can deliver, not manage", () => {
    expect(canRecordDelivery("inventory_staff")).toBe(true);
    expect(canRecordDelivery("admin")).toBe(true);
    expect(canRecordDelivery("manager")).toBe(true);
    expect(canRecordDelivery("waiter")).toBe(false);
    expect(canManageIngredients("inventory_staff")).toBe(false);
    expect(canManageIngredients("admin")).toBe(true);
  });

  it("dialog has quantity + notes, no type selector", () => {
    render(
      <RecordDeliveryDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        ingredientId="ing-1"
        ingredientName="Rice"
        ingredientUnit="kg"
      />
    );
    expect(screen.getByText("Record Stock Delivery")).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notes/i)).toBeInTheDocument();
    expect(screen.queryByText(/Adjustment Type/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Stock Outward/i)).not.toBeInTheDocument();
  });

  it("no raw UUID visible", () => {
    const uuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    render(
      <RecordDeliveryDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        ingredientId={uuid}
        ingredientName="Rice"
        ingredientUnit="kg"
      />
    );
    expect(screen.queryByText(uuid)).not.toBeInTheDocument();
  });
});
