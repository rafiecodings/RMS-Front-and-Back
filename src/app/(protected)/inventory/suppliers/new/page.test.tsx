import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import NewSupplierPage from "./page";
import { useAuth } from "@/providers/AuthProvider";
import { ROLES } from "@/lib/utils/permissions";

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/lib/hooks", () => ({
  useSuppliers: () => ({
    create: { mutate: vi.fn(), isPending: false },
    list: { data: { data: { data: [] } } },
  }),
}));

vi.mock("@/features/inventory", () => ({
  SupplierForm: () => <div>SupplierFormStub</div>,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("next/link", () => ({
  default: ({ children }: { children?: ReactNode }) => <a>{children}</a>,
}));

function setRole(role?: string) {
  vi.mocked(useAuth).mockReturnValue({
    user: role ? { id: "u-1", role, name: "Tester", email: "t@e.com" } : null,
    isLoading: false,
    isAuthenticated: Boolean(role),
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>);
}

// Approximates a direct-URL visit to /inventory/suppliers/new: the page must
// refuse to render the form for roles lacking inventory edit permission.
describe("suppliers/new route guard", () => {
  it("renders the supplier form for inventory editors (admin, manager, inventory_staff)", () => {
    for (const role of [ROLES.ADMIN, ROLES.MANAGER, ROLES.INVENTORY_STAFF]) {
      setRole(role);
      const { unmount } = render(<NewSupplierPage />);
      expect(screen.queryByText("Add Supplier")).not.toBeNull();
      expect(screen.queryByText("You cannot create suppliers.")).toBeNull();
      unmount();
    }
  });

  it("shows an unauthorized message for roles without inventory edit (waiter, cashier, kitchen)", () => {
    for (const role of [ROLES.WAITER, ROLES.CASHIER, ROLES.KITCHEN_STAFF]) {
      setRole(role);
      const { unmount } = render(<NewSupplierPage />);
      expect(screen.queryByText("You cannot create suppliers.")).not.toBeNull();
      expect(screen.queryByText("Add Supplier")).toBeNull();
      unmount();
    }
  });
});
