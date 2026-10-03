import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MenuItemForm } from "./MenuItemForm";
import type { MenuCategory, MenuItem } from "@/lib/types";

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

const UUID = "00000000-0000-0000-0000-000000000001";

const editItem: MenuItem = {
  id: "item-1",
  category_id: UUID,
  name: "Herb Rice Bowl",
  price: 219,
  is_available: true,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

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

  it("edit form shows the category name, never the raw UUID", () => {
    render(
      <MenuItemForm
        initialData={editItem}
        categories={[{ ...category, id: UUID, name: "Main Course" }]}
        onSubmit={vi.fn()}
        submitLabel="Update Item"
      />
    );

    expect(screen.getByText("Main Course")).toBeInTheDocument();
    expect(screen.queryByText(UUID)).toBeNull();
  });

  it("submits the category UUID, not the category name", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <MenuItemForm
        initialData={editItem}
        categories={[{ ...category, id: UUID, name: "Main Course" }]}
        onSubmit={onSubmit}
        submitLabel="Update Item"
      />
    );

    await user.click(screen.getByText("Update Item"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ category_id: UUID });
  });

  it("add form lists category names, never raw UUIDs", async () => {
    const user = userEvent.setup();

    render(
      <MenuItemForm
        categories={[
          { ...category, id: "c-mains", name: "Main Course" },
          { ...category, id: "c-dessert", name: "Desserts" },
        ]}
        onSubmit={vi.fn()}
        submitLabel="Create Item"
      />
    );

    const combos = screen.getAllByRole("combobox");
    // First combobox is the category selector.
    await user.click(combos[0]);
    const listbox = await screen.findByRole("listbox");
    const options = within(listbox).getAllByRole("option");
    const labels = options.map((o) => o.textContent ?? "");
    expect(labels).toContain("Main Course");
    expect(labels).toContain("Desserts");
    expect(labels.join(" ")).not.toContain("00000000-0000-0000-0000-");
  });

  it("shows a loading label instead of the UUID while categories load", () => {
    render(
      <MenuItemForm
        initialData={editItem}
        categories={[]}
        isCategoriesLoading
        onSubmit={vi.fn()}
        submitLabel="Update Item"
      />
    );

    expect(screen.getByText("Loading categories...")).toBeInTheDocument();
    expect(screen.queryByText(UUID)).toBeNull();
  });

  it("shows Unknown Category for a missing category, never the UUID", () => {
    render(
      <MenuItemForm
        initialData={editItem}
        categories={[{ ...category, id: "c-other", name: "Mains" }]}
        onSubmit={vi.fn()}
        submitLabel="Update Item"
      />
    );

    expect(screen.getByText("Unknown Category")).toBeInTheDocument();
    expect(screen.queryByText(UUID)).toBeNull();
  });
});

describe("MenuItemForm image label", () => {
  const uploadedItem = {
    ...editItem,
    image_url: "/storage/menu-items/CnVYvTp27ZFHOaXUGRL54wJmkHHltMbFUzyVMCTC.png",
  };

  function renderForm(item: typeof editItem) {
    return render(
      <MenuItemForm
        initialData={item}
        categories={[{ ...category, id: UUID, name: "Main Course" }]}
        onSubmit={vi.fn()}
        submitLabel="Update Item"
      />
    );
  }

  it("never renders the raw storage path for an uploaded image", () => {
    const { container } = renderForm(uploadedItem);
    expect(container.textContent).not.toContain("/storage/menu-items/");
    expect(container.textContent).not.toContain("CnVYvTp27ZFHOaXUGRL54wJmkHHltMbFUzyVMCTC");
  });

  it("labels an uploaded image with a short readable marker", () => {
    renderForm(uploadedItem);
    expect(screen.getByText("Uploaded image")).toBeInTheDocument();
  });

  it("labels a preset image with its human name, not its path", () => {
    renderForm({ ...editItem, image_url: "/images/menu-items/halo-halo.jpg" });
    expect(screen.getByText("Halo-Halo")).toBeInTheDocument();
    expect(screen.queryByText("/images/menu-items/halo-halo.jpg")).toBeNull();
  });
});

describe("MenuItemForm modal layout", () => {
  it("scrolls the body and pins actions in a footer only in modal mode", () => {
    const { container, rerender } = render(
      <MenuItemForm
        categories={[category]}
        onSubmit={vi.fn()}
        submitLabel="Create Item"
        modal
        onCancel={vi.fn()}
      />
    );

    expect(container.querySelector(".flex-1.overflow-y-auto")).not.toBeNull();
    const submit = screen.getByRole("button", { name: /create item/i });
    const footer = submit.closest("div");
    expect(footer?.className).toContain("shrink-0");
    expect(footer?.className).toContain("border-t");
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();

    // Page usage (non-modal) must NOT gain a pinned footer.
    rerender(
      <MenuItemForm
        categories={[category]}
        onSubmit={vi.fn()}
        submitLabel="Create Item"
      />
    );
    expect(container.querySelector(".flex-1.overflow-y-auto")).toBeNull();
    expect(screen.queryByRole("button", { name: /cancel/i })).toBeNull();
  });
});
