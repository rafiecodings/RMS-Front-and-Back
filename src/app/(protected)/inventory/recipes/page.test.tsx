import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RecipesPage from "./page";
import { useAuth } from "@/providers/AuthProvider";

vi.mock("@/providers/AuthProvider");
vi.mock("@/lib/hooks", () => ({
  useRecipes: vi.fn(() => ({
    list: { data: undefined, isLoading: false },
    create: { mutate: vi.fn(), isPending: false },
    update: { mutate: vi.fn(), isPending: false },
  })),
}));

function setRole(role: string) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: "u1", role } as never,
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>);
}

afterEach(() => {
  cleanup();
});

describe("RecipesPage role-based rendering", () => {
  it("renders without throwing for every role (P0: canManageRecipes is a function)", () => {
    for (const role of [
      "admin",
      "manager",
      "inventory_staff",
      "cashier",
      "waiter",
      "kitchen_staff",
    ]) {
      setRole(role);
      expect(() => render(<RecipesPage />)).not.toThrow();
      cleanup();
    }
  });

  it("shows Add Recipe for admin and manager only", () => {
    setRole("admin");
    render(<RecipesPage />);
    expect(screen.getByRole("button", { name: /add recipe/i })).toBeInTheDocument();
    cleanup();

    setRole("manager");
    render(<RecipesPage />);
    expect(screen.getByRole("button", { name: /add recipe/i })).toBeInTheDocument();
    cleanup();

    setRole("inventory_staff");
    render(<RecipesPage />);
    expect(screen.queryByRole("button", { name: /add recipe/i })).not.toBeInTheDocument();
  });
});
