import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import MenuItemsPage from "./page";

vi.mock("next/navigation", () => ({ usePathname: () => "/menu/items", useRouter: () => ({}) }));
vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "u", role: "admin" } }),
}));

const categories = [
  { id: "00000000-0000-0000-0000-cce80a72bc34", name: "Appetizer", items_count: 1, image_url: null, slug: "appetizer", is_active: true, sort_order: 1 },
];

vi.mock("@/lib/hooks", () => ({
  useMenuCategories: () => ({ list: { data: categories, isLoading: false } }),
  useMenuItems: () => ({
    list: { data: { data: { data: [], meta: null } }, isLoading: false },
    create: { mutate: vi.fn(), isPending: false },
    update: { mutate: vi.fn(), isPending: false },
    remove: { mutate: vi.fn(), isPending: false },
    toggleAvailability: { mutate: vi.fn() },
    uploadImage: { mutateAsync: vi.fn() },
  }),
}));

describe("Menu items category filter", () => {
  it("shows the category name, never the raw UUID, in the trigger", async () => {
    const user = userEvent.setup();
    const { container } = render(<MenuItemsPage />);

    const trigger = screen.getAllByRole("combobox")[0];
    await user.click(trigger);
    const option = await screen.findByRole("option", { name: "Appetizer" });
    await user.click(option);

    expect(trigger).toHaveTextContent("Appetizer");
    expect(container.textContent).not.toContain("00000000-0000-0000-0000");
  });
});

describe("Edit Item modal layout", () => {
  async function openEditDialog() {
    const user = userEvent.setup();
    const container = render(<MenuItemsPage />);
    await user.click(screen.getByRole("button", { name: /add item/i }));
    return { user, container };
  }

  it("keeps the primary action in a non-shrinking footer, never clipped", async () => {
    await openEditDialog();

    const submit = await screen.findByRole("button", { name: /create item/i });
    // The action button must live in a footer that cannot be compressed or
    // scrolled out of view.
    const footer = submit.closest("div");
    expect(footer).not.toBeNull();
    expect(footer?.className).toContain("shrink-0");
    expect(footer?.className).toContain("border-t");
    // ...and the scroll container must be a sibling, not the footer itself.
    // Dialog renders in a portal, so query the document rather than the tree.
    const scroller = document.querySelector(".flex-1.overflow-y-auto");
    expect(scroller).not.toBeNull();
    expect(footer?.className).not.toContain("overflow-y-auto");
  });

  it("constrains the dialog to a flex column with an internal scroll area", async () => {
    await openEditDialog();

    const dialog = document.querySelector("[data-slot='dialog-content']");
    expect(dialog).not.toBeNull();
    const cls = dialog?.className ?? "";
    expect(cls).toContain("flex");
    expect(cls).toContain("flex-col");
    // Whole-modal scrolling is what clipped the button before.
    expect(cls).toContain("overflow-hidden");
    expect(cls).not.toContain("overflow-y-auto");
    expect(cls).toContain("p-0");
  });

  it("renders a Cancel action that closes the dialog", async () => {
    const { user } = await openEditDialog();
    const cancel = await screen.findByRole("button", { name: /cancel/i });
    await user.click(cancel);
    expect(screen.queryByRole("button", { name: /create item/i })).toBeNull();
  });
});
