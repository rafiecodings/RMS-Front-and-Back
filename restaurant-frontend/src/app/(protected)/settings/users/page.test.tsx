import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UsersPage from "./page";

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: mockUseAuth,
}));

const { mockGet, mockPut } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPut: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  default: { get: mockGet, put: mockPut },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const USERS = [
  {
    id: "u-admin",
    name: "Alice Admin",
    email: "alice@example.com",
    role: "admin",
    is_active: true,
    last_login_at: null,
  },
  {
    id: "u-waiter",
    name: "Wally Waiter",
    email: "wally@example.com",
    role: "waiter",
    is_active: true,
    last_login_at: null,
  },
];

const ROLES = [
  { id: "r-admin", name: "admin" },
  { id: "r-manager", name: "manager" },
  { id: "r-waiter", name: "waiter" },
];

function mockApi() {
  mockGet.mockImplementation((url: string) => {
    if (url === "/admin/users") {
      return Promise.resolve({
        data: {
          success: true,
          data: {
            items: USERS,
            pagination: { current_page: 1, last_page: 1, per_page: 100, total: 2 },
          },
        },
      });
    }
    if (url === "/admin/roles") {
      return Promise.resolve({ data: { data: ROLES } });
    }
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
}

function renderPage(role: string) {
  mockUseAuth.mockReturnValue({
    user: { id: "me", name: "Me", email: "me@example.com", role },
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <UsersPage />
    </QueryClientProvider>
  );
}

describe("Users & Roles page RBAC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it("manager can view the user list", async () => {
    renderPage("manager");
    // Page renders both desktop table and mobile cards (CSS-hidden twin).
    expect(await screen.findAllByText("Alice Admin")).not.toHaveLength(0);
    expect(screen.getAllByText("wally@example.com").length).toBeGreaterThan(0);
  });

  it("manager sees roles as read-only text with no interactive dropdown", async () => {
    renderPage("manager");
    await screen.findAllByText("Alice Admin");
    await waitFor(() => {
      expect(screen.getByTestId("role-readonly-u-admin")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("role-select-u-admin")).toBeNull();
    expect(screen.queryByTestId("role-select-u-waiter")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("manager has no create/delete user controls", async () => {
    renderPage("manager");
    await screen.findAllByText("Alice Admin");
    expect(screen.queryByText(/add user/i)).toBeNull();
    expect(screen.queryByText(/create user/i)).toBeNull();
    expect(screen.queryByText(/delete/i)).toBeNull();
  });

  it("admin keeps editable role dropdowns", async () => {
    renderPage("admin");
    await screen.findAllByText("Alice Admin");
    await waitFor(() => {
      expect(screen.getByTestId("role-select-u-admin")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("role-readonly-u-admin")).toBeNull();
  });
});
